using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.GenerateTranscription;

public record GenerateTranscriptionCommand(
    Guid UserId,
    string ModelId,
    string? AudioUrl = null,
    Stream? AudioStream = null,
    string? FileName = null) : IRequest<GenerationResponse>;
