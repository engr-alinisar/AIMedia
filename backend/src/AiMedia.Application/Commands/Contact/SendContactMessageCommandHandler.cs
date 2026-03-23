using AiMedia.Application.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace AiMedia.Application.Commands.Contact;

public class SendContactMessageCommandHandler(
    IEmailService emailService,
    ILogger<SendContactMessageCommandHandler> logger)
    : IRequestHandler<SendContactMessageCommand, Unit>
{
    public async Task<Unit> Handle(SendContactMessageCommand request, CancellationToken cancellationToken)
    {
        // Validate required fields
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ArgumentException("Name is required.");
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("Email is required.");
        if (string.IsNullOrWhiteSpace(request.Subject))
            throw new ArgumentException("Subject is required.");
        if (string.IsNullOrWhiteSpace(request.Message))
            throw new ArgumentException("Message is required.");
        if (request.Message.Trim().Length < 10)
            throw new ArgumentException("Message must be at least 10 characters.");
        if (request.Message.Length > 2000)
            throw new ArgumentException("Message must be 2000 characters or fewer.");

        logger.LogInformation(
            "Contact form submitted by {Name} <{Email}>, subject: {Subject}, userId: {UserId}",
            request.Name, request.Email, request.Subject, request.UserId?.ToString() ?? "anonymous");

        // Send notification to support inbox
        await emailService.SendContactNotificationAsync(
            request.Name, request.Email, request.Subject, request.Message, request.UserId, cancellationToken);

        // Send auto-reply to the sender
        await emailService.SendContactAutoReplyAsync(
            request.Name, request.Email, request.Message, cancellationToken);

        return Unit.Value;
    }
}
