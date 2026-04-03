using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.GenerateMotionControl;

public record GenerateMotionControlCommand(
    Guid UserId,
    string ImageUrl,
    string VideoUrl,
    string Prompt,
    string ModelId,
    int DurationSeconds,
    bool IsPublic = true,
    string? Zone = null,
    bool KeepOriginalSound = true,
    string CharacterOrientation = "video",
    string? ElementImageUrl = null) : IRequest<GenerationResponse>;
