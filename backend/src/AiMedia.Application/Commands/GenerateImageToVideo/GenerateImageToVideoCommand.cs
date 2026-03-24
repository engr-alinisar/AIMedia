using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.GenerateImageToVideo;

public record GenerateImageToVideoCommand(
    Guid UserId,
    string ImageUrl,
    string? Prompt,
    string ModelId,
    int DurationSeconds = 5,
    bool IsPublic = true,
    string Resolution = "720p",
    bool MultiShot = false,
    bool GenerateAudio = true,
    string AspectRatio = "16:9",
    string? Zone = null,
    string? EndImageUrl = null) : IRequest<GenerationResponse>;
