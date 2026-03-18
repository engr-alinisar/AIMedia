using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.GenerateTextToVideo;

public record GenerateTextToVideoCommand(
    Guid UserId,
    string Prompt,
    string ModelId,
    int DurationSeconds = 5,
    string AspectRatio = "16:9") : IRequest<GenerationResponse>;
