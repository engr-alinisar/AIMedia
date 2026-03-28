using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.GenerateVoice;

public record GenerateVoiceCommand(
    Guid UserId,
    string Text,
    string ModelId,
    string? VoiceId = null,
    Guid? VoiceCloneId = null,
    string? RefAudioUrl = null,
    bool IsPublic = true,
    string? Zone = null,
    float? Speed = null,
    float? Stability = null,
    float? SimilarityBoost = null,
    float? VoiceStyle = null,
    string? LanguageCode = null,
    int? Pitch = null,
    float? Vol = null,
    string? Emotion = null,
    string? Title = null) : IRequest<GenerationResponse>;
