using MediatR;

namespace AiMedia.Application.Commands.Auth;

public record ChangePasswordCommand(Guid UserId, string CurrentPassword, string NewPassword) : IRequest<Unit>;
