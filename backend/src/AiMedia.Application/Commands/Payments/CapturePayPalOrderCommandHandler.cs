using AiMedia.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AiMedia.Application.Commands.Payments;

public class CapturePayPalOrderCommandHandler(
    IPayPalService paypal,
    ICreditService credits,
    IEmailService email,
    IAppDbContext db,
    ILogger<CapturePayPalOrderCommandHandler> logger)
    : IRequestHandler<CapturePayPalOrderCommand, bool>
{
    public async Task<bool> Handle(CapturePayPalOrderCommand request, CancellationToken ct)
    {
        var (success, customId, captureId) = await paypal.CaptureOrderAsync(request.OrderId, ct);

        if (!success)
        {
            logger.LogWarning("PayPal capture failed for order {OrderId}", request.OrderId);
            return false;
        }

        // customId format: "{userId}:{packId}"
        var parts = customId.Split(':', 2);
        if (parts.Length != 2 || !Guid.TryParse(parts[0], out var userId))
        {
            logger.LogError("Invalid PayPal custom_id: {CustomId}", customId);
            return false;
        }

        var packId = parts[1].ToLower();
        if (!CreditPacks.All.TryGetValue(packId, out var pack))
        {
            logger.LogError("Unknown pack in PayPal custom_id: {PackId}", packId);
            return false;
        }

        // Idempotency — skip if capture already processed
        var tag = $"[paypal:{captureId}]";
        var alreadyProcessed = !string.IsNullOrEmpty(captureId) &&
            await db.CreditTransactions.AnyAsync(t => t.Description.Contains(tag), ct);

        if (alreadyProcessed)
        {
            logger.LogInformation("PayPal capture {CaptureId} already processed — skipping", captureId);
            return true;
        }

        var description = $"Purchased {pack.Credits} credits (${pack.Price:F2}) {tag}";
        await credits.AddCreditsAsync(userId, pack.Credits, description, ct);

        logger.LogInformation("Added {Credits} credits to user {UserId} via PayPal order {OrderId}",
            pack.Credits, userId, request.OrderId);

        // Send receipt email
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is not null)
        {
            try
            {
                await email.SendReceiptEmailAsync(
                    user.Email, user.FullName ?? "there",
                    pack.Label, pack.Credits, pack.Price,
                    captureId, ct);
                logger.LogInformation("Receipt email sent to {Email} for capture {CaptureId}", user.Email, captureId);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send receipt email to {Email} for capture {CaptureId}", user.Email, captureId);
            }
        }

        return true;
    }
}
