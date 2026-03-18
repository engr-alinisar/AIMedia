using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.GenerateBackgroundRemoval;

public record GenerateBackgroundRemovalCommand(
    Guid UserId,
    string? ImageUrl = null,
    Stream? ImageStream = null,
    string? FileName = null) : IRequest<GenerationResponse>;
