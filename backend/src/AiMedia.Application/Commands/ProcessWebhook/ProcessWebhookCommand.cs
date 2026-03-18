using MediatR;

namespace AiMedia.Application.Commands.ProcessWebhook;

public record ProcessWebhookCommand(string FalRequestId, string Status, string? OutputUrl, string? ErrorMessage, string? RawPayload) : IRequest;
