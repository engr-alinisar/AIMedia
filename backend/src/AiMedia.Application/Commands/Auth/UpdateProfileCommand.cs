using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.Auth;

public record UpdateProfileCommand(Guid UserId, string? DisplayName) : IRequest<UserDto>;
