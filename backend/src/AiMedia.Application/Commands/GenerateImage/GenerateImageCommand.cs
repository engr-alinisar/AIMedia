using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.GenerateImage;

public record GenerateImageCommand(
    Guid UserId,
    string Prompt,
    string ModelId,
    string ImageSize = "square_hd",
    string? NegativePrompt = null) : IRequest<GenerationResponse>;
