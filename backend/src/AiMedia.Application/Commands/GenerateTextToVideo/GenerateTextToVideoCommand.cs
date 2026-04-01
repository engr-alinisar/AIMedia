using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.GenerateTextToVideo;

public record GenerateTextToVideoCommand(
    Guid UserId,
    string? Prompt,
    string ModelId,
    int DurationSeconds = 5,
    string AspectRatio = "16:9",
    bool IsPublic = true,
    string Resolution = "720p",
    bool MultiShot = false,
    bool GenerateAudio = true,
    string? Zone = null,
    string? NegativePrompt = null,
    float? CfgScale = null,
    List<string>? MultiPrompts = null,
    bool PromptOptimizer = true,
    int? Seed = null,
    bool AutoFix = false) : IRequest<GenerationResponse>;
