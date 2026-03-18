using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.Auth;

public record RegisterCommand(string Email, string Password, string? FullName) : IRequest<AuthResponse>;
