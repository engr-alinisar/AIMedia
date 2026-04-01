using MediatR;

namespace AiMedia.Application.Commands.ProcessWebhook;

public record ProcessWebhookCommand(
    Guid JobId,
    string FalRequestId,
    string Status,
    string? OutputUrl,
    string? ErrorMessage,
    string? RawPayload,
    string? OutputText = null   // for transcription results (plain text, not a URL)
) : IRequest;
