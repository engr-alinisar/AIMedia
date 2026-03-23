using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.GenerateImageToVideo;

public record GenerateImageToVideoCommand(
    Guid UserId,
    string ImageUrl,
    string? Prompt,
    string ModelId,
    int DurationSeconds = 5,
    bool IsPublic = true) : IRequest<GenerationResponse>;
