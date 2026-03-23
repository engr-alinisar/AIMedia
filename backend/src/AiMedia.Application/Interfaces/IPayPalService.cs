namespace AiMedia.Application.Interfaces;

public interface IPayPalService
{
    Task<string> CreateOrderAsync(string packId, decimal amount, Guid userId, CancellationToken ct = default);
    Task<(bool Success, string CustomId)> CaptureOrderAsync(string orderId, CancellationToken ct = default);
}
