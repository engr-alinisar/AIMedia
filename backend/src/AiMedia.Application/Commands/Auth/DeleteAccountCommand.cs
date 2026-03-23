using MediatR;

namespace AiMedia.Application.Commands.Auth;

public record DeleteAccountCommand(Guid UserId, string Password) : IRequest<Unit>;
