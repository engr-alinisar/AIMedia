using MediatR;

namespace AiMedia.Domain.Events;

public record JobCompletedEvent(
    Guid JobId,
    Guid UserId,
    string? OutputR2Key,
    int CreditsCharged) : INotification;
