using AiMedia.Application.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AiMedia.Application.Commands.Payments;

public class CapturePayPalOrderCommandHandler(
    IPayPalService paypal,
    ICreditService credits,
    ILogger<CapturePayPalOrderCommandHandler> logger)
    : IRequestHandler<CapturePayPalOrderCommand, bool>
{
    public async Task<bool> Handle(CapturePayPalOrderCommand request, CancellationToken ct)
    {
        var (success, customId) = await paypal.CaptureOrderAsync(request.OrderId, ct);

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

        await credits.AddCreditsAsync(userId, pack.Credits, $"Purchased {pack.Credits} credits (${pack.Price:F2})", ct);

        logger.LogInformation("Added {Credits} credits to user {UserId} via PayPal order {OrderId}",
            pack.Credits, userId, request.OrderId);

        return true;
    }
}
