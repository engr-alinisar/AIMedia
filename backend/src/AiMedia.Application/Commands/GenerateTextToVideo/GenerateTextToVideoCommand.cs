using AiMedia.Application.DTOs;
using AiMedia.Domain.Enums;
using MediatR;

namespace AiMedia.Application.Commands.GenerateTextToVideo;

public record GenerateTextToVideoCommand(
    Guid UserId,
    string Prompt,
    ModelTier Tier,
    int DurationSeconds = 5,
    string AspectRatio = "16:9") : IRequest<GenerationResponse>;
