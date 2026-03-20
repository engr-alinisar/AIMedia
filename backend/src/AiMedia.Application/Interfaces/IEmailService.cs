namespace AiMedia.Application.Interfaces;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string toEmail, string fullName, string token, CancellationToken ct = default);
}
