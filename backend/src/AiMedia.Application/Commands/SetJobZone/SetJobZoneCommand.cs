using MediatR;

namespace AiMedia.Application.Commands.SetJobZone;

public record SetJobZoneCommand(Guid JobId, Guid UserId, string? Zone) : IRequest;
