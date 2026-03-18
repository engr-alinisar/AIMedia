using AiMedia.Application.DTOs;
using AiMedia.Domain.Enums;
using MediatR;

namespace AiMedia.Application.Commands.GenerateImage;

public record GenerateImageCommand(
    Guid UserId,
    string Prompt,
    ModelTier Tier,
    int Width = 1024,
    int Height = 1024,
    string? NegativePrompt = null) : IRequest<GenerationResponse>;
