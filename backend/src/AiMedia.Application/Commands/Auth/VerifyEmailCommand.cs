using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.Auth;

public record VerifyEmailCommand(string Token) : IRequest<AuthResponse>;
