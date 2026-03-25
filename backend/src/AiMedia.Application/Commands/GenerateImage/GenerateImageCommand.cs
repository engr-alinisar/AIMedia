using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.GenerateImage;

public record GenerateImageCommand(
    Guid UserId,
    string Prompt,
    string ModelId,
    string ImageSize = "square_hd",
    string? NegativePrompt = null,
    bool IsPublic = true,
    string? Zone = null,
    string? AspectRatio = null,
    string? Style = null,
    string? Quality = null,
    string? Background = null,
    string? Resolution = null) : IRequest<GenerationResponse>;
