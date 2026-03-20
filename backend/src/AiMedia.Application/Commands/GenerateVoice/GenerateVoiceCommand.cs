using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.GenerateVoice;

public record GenerateVoiceCommand(
    Guid UserId,
    string Text,
    string ModelId,
    string? VoiceId = null,
    Guid? VoiceCloneId = null,
    string? RefAudioUrl = null) : IRequest<GenerationResponse>;
