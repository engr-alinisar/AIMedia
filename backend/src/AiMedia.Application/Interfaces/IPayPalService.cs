namespace AiMedia.Application.Interfaces;

public interface IPayPalService
{
    Task<string> CreateOrderAsync(string packId, decimal amount, Guid userId, CancellationToken ct = default);
    Task<(bool Success, string CustomId, string CaptureId)> CaptureOrderAsync(string orderId, CancellationToken ct = default);
    Task<bool> VerifyWebhookSignatureAsync(string webhookId, string transmissionId, string transmissionTime, string certUrl, string authAlgo, string transmissionSig, string rawBody, CancellationToken ct = default);
}
