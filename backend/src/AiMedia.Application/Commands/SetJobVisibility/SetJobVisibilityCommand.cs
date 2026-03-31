using MediatR;

namespace AiMedia.Application.Commands.SetJobVisibility;

public record SetJobVisibilityCommand(Guid JobId, Guid UserId, bool IsPublic) : IRequest;
