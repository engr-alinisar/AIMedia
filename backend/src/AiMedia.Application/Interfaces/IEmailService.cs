namespace AiMedia.Application.Interfaces;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string toEmail, string fullName, string token, CancellationToken ct = default);
    Task SendReceiptEmailAsync(string toEmail, string fullName, string packName, int credits, decimal amount, string orderId, CancellationToken ct = default);
    Task SendLowCreditsEmailAsync(string toEmail, string fullName, int balance, CancellationToken ct = default);
    Task SendPaymentDeclinedEmailAsync(string toEmail, string fullName, CancellationToken ct = default);
    Task SendPaymentReversedEmailAsync(string toEmail, string fullName, int credits, CancellationToken ct = default);
}
