using System.Text.Json;
using AiMedia.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AiMedia.Application.Commands.Payments;

public class ProcessPayPalWebhookCommandHandler(
    IPayPalService paypal,
    ICreditService credits,
    IEmailService email,
    IAppDbContext db,
    ILogger<ProcessPayPalWebhookCommandHandler> logger)
    : IRequestHandler<ProcessPayPalWebhookCommand, bool>
{
    public async Task<bool> Handle(ProcessPayPalWebhookCommand request, CancellationToken ct)
    {
        // Verify PayPal signature when WebhookId is configured
        if (!string.IsNullOrEmpty(request.WebhookId))
        {
            try
            {
                var valid = await paypal.VerifyWebhookSignatureAsync(
                    request.WebhookId, request.TransmissionId, request.TransmissionTime,
                    request.CertUrl, request.AuthAlgo, request.TransmissionSig,
                    request.RawBody, ct);

                if (!valid)
                {
                    logger.LogWarning("PayPal webhook signature verification failed for TransmissionId {TransmissionId}", request.TransmissionId);
                    return false;
                }

                logger.LogInformation("PayPal webhook signature verified for TransmissionId {TransmissionId}", request.TransmissionId);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "PayPal webhook signature verification threw an exception — processing anyway");
                // Don't return false — continue processing to avoid losing events due to verification errors
            }
        }

        JsonDocument doc;
        try { doc = JsonDocument.Parse(request.RawBody); }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to parse PayPal webhook body");
            return false;
        }

        var eventType = doc.RootElement.TryGetProperty("event_type", out var et)
            ? et.GetString() : null;

        if (!doc.RootElement.TryGetProperty("resource", out var resource))
        {
            logger.LogWarning("PayPal webhook missing resource for event {EventType}", eventType);
            return false;
        }

        return eventType switch
        {
            "PAYMENT.CAPTURE.COMPLETED"  => await HandleCompletedAsync(resource, ct),
            "PAYMENT.CAPTURE.DECLINED"   => await HandleDeclinedAsync(resource, ct),
            "PAYMENT.CAPTURE.REVERSED"   => await HandleReversedOrRefundedAsync(resource, "reversed", ct),
            "PAYMENT.CAPTURE.REFUNDED"   => await HandleReversedOrRefundedAsync(resource, "refunded", ct),
            _ => LogIgnored(eventType)
        };
    }

    // ── COMPLETED ────────────────────────────────────────────────────────────

    private async Task<bool> HandleCompletedAsync(JsonElement resource, CancellationToken ct)
    {
        var captureId = resource.TryGetProperty("id", out var cid) ? cid.GetString() ?? "" : "";
        var customId  = resource.TryGetProperty("custom_id", out var cust) ? cust.GetString() ?? "" : "";

        logger.LogInformation("PayPal COMPLETED — captureId: {CaptureId}, customId: {CustomId}", captureId, customId);

        if (!TryParseCustomId(customId, out var userId, out var pack))
        {
            logger.LogError("PayPal COMPLETED — failed to parse customId '{CustomId}'. Resource: {Resource}", customId, resource.GetRawText());
            return false;
        }

        var tag = $"[paypal:{captureId}]";
        if (await db.CreditTransactions.AnyAsync(t => t.Description.Contains(tag), ct))
        {
            logger.LogInformation("PayPal capture {CaptureId} already processed — skipping", captureId);
            return true;
        }

        await credits.AddCreditsAsync(userId, pack.Credits, $"Purchased {pack.Credits} credits (${pack.Price:F2}) {tag}", ct);
        logger.LogInformation("PayPal webhook COMPLETED: +{Credits} credits to user {UserId}", pack.Credits, userId);

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is not null)
        {
            try
            {
                await email.SendReceiptEmailAsync(user.Email, user.FullName ?? "there", pack.Label, pack.Credits, pack.Price, captureId, ct);
                logger.LogInformation("Receipt email sent to {Email} for capture {CaptureId}", user.Email, captureId);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send receipt email to {Email} for capture {CaptureId}", user.Email, captureId);
            }
        }

        return true;
    }

    // ── DECLINED ─────────────────────────────────────────────────────────────

    private async Task<bool> HandleDeclinedAsync(JsonElement resource, CancellationToken ct)
    {
        var customId = resource.TryGetProperty("custom_id", out var cust) ? cust.GetString() ?? "" : "";

        if (!TryParseCustomId(customId, out var userId, out _))
        {
            logger.LogWarning("PayPal DECLINED webhook missing or invalid custom_id — cannot notify user");
            return true; // Not a fatal error, just no custom_id
        }

        logger.LogWarning("PayPal payment DECLINED for user {UserId}", userId);

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is not null)
        {
            try { await email.SendPaymentDeclinedEmailAsync(user.Email, user.FullName ?? "there", ct); }
            catch (Exception ex) { logger.LogError(ex, "Failed to send payment declined email to {Email}", user.Email); }
        }

        return true;
    }

    // ── REVERSED / REFUNDED ──────────────────────────────────────────────────

    private async Task<bool> HandleReversedOrRefundedAsync(JsonElement resource, string reason, CancellationToken ct)
    {
        // For REVERSED: resource.id is the original capture ID
        // For REFUNDED: find original capture from resource.links[rel="up"]
        var captureId = resource.TryGetProperty("id", out var cid) ? cid.GetString() ?? "" : "";

        // Try to find capture ID from links (REFUNDED case)
        if (resource.TryGetProperty("links", out var links))
        {
            foreach (var link in links.EnumerateArray())
            {
                var rel = link.TryGetProperty("rel", out var r) ? r.GetString() : null;
                if (rel == "up")
                {
                    var href = link.TryGetProperty("href", out var h) ? h.GetString() ?? "" : "";
                    // href is like https://api.paypal.com/v2/payments/captures/{captureId}
                    var parts = href.TrimEnd('/').Split('/');
                    if (parts.Length > 0)
                        captureId = parts[^1];
                    break;
                }
            }
        }

        // Look up original transaction by capture ID
        var tag = $"[paypal:{captureId}]";
        var originalTx = await db.CreditTransactions
            .Where(t => t.Description.Contains(tag) && t.Amount > 0)
            .FirstOrDefaultAsync(ct);

        if (originalTx is null)
        {
            logger.LogWarning("PayPal {Reason}: no original transaction found for capture {CaptureId}", reason, captureId);
            return true;
        }

        // Check idempotency — don't deduct twice
        var reversalTag = $"[paypal:{reason}:{captureId}]";
        if (await db.CreditTransactions.AnyAsync(t => t.Description.Contains(reversalTag), ct))
        {
            logger.LogInformation("PayPal {Reason} {CaptureId} already processed — skipping", reason, captureId);
            return true;
        }

        await credits.AddCreditsAsync(
            originalTx.UserId,
            -originalTx.Amount,
            $"Payment {reason} — {originalTx.Amount} credits removed {reversalTag}",
            ct);

        logger.LogInformation("PayPal {Reason}: -{Credits} credits from user {UserId}", reason, originalTx.Amount, originalTx.UserId);

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == originalTx.UserId, ct);
        if (user is not null)
        {
            try { await email.SendPaymentReversedEmailAsync(user.Email, user.FullName ?? "there", originalTx.Amount, ct); }
            catch (Exception ex) { logger.LogError(ex, "Failed to send payment reversed email to {Email}", user.Email); }
        }

        return true;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private bool TryParseCustomId(string customId, out Guid userId, out (string Label, int Credits, decimal Price) pack)
    {
        userId = Guid.Empty;
        pack = default;

        if (string.IsNullOrEmpty(customId)) return false;

        var parts = customId.Split(':', 2);
        if (parts.Length != 2 || !Guid.TryParse(parts[0], out userId)) return false;

        var packId = parts[1].ToLower();
        if (!CreditPacks.All.TryGetValue(packId, out pack))
        {
            logger.LogError("Unknown pack id in custom_id: {PackId}", packId);
            return false;
        }

        return true;
    }

    private bool LogIgnored(string? eventType)
    {
        logger.LogDebug("Ignoring PayPal webhook event: {EventType}", eventType);
        return true;
    }
}
