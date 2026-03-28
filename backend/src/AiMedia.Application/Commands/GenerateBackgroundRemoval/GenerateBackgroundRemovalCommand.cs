using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.GenerateBackgroundRemoval;

public record GenerateBackgroundRemovalCommand(
    Guid UserId,
    string? ImageUrl = null,
    Stream? ImageStream = null,
    string? FileName = null,
    string ModelId = "fal-ai/pixelcut/remove-background",
    bool IsPublic = true,
    string? Zone = null,
    // Extended Image Studio params
    string? Prompt = null,
    string? NegativePrompt = null,
    string? SecondaryImageUrl = null,
    Stream? SecondaryImageStream = null,
    string? SecondaryFileName = null,
    string? MaskUrl = null,
    string? BackgroundStyle = null,
    string? MakeupStyle = null,
    string? MakeupIntensity = null,
    string? RenderingSpeed = null,
    string? ImageSize = null) : IRequest<GenerationResponse>;
