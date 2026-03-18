using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.Auth;

public record LoginCommand(string Email, string Password) : IRequest<AuthResponse>;
