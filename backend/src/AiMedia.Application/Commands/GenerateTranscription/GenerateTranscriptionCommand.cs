using AiMedia.Application.DTOs;
using AiMedia.Domain.Enums;
using MediatR;

namespace AiMedia.Application.Commands.GenerateTranscription;

public record GenerateTranscriptionCommand(
    Guid UserId,
    ModelTier Tier,
    string? AudioUrl = null,
    Stream? AudioStream = null,
    string? FileName = null) : IRequest<GenerationResponse>;
