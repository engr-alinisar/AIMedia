using AiMedia.Application.DTOs;
using AiMedia.Domain.Enums;
using MediatR;

namespace AiMedia.Application.Commands.GenerateImageToVideo;

public record GenerateImageToVideoCommand(
    Guid UserId,
    string ImageUrl,
    string? Prompt,
    ModelTier Tier,
    int DurationSeconds = 5) : IRequest<GenerationResponse>;
