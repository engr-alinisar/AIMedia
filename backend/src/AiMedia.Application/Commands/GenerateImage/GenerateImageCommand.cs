using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.GenerateImage;

public record GenerateImageCommand(
    Guid UserId,
    string Prompt,
    string ModelId,
    int Width = 1024,
    int Height = 1024,
    string? NegativePrompt = null) : IRequest<GenerationResponse>;
