using MediatR;

namespace AiMedia.Domain.Events;

public record JobFailedEvent(
    Guid JobId,
    Guid UserId,
    int CreditsReleased,
    string? ErrorMessage,
    string Product = "",
    string ModelName = "") : INotification;
