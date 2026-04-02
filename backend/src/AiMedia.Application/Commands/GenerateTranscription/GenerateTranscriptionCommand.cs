using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Commands.GenerateTranscription;

public record GenerateTranscriptionCommand(
    Guid UserId,
    string ModelId,
    int? DurationSeconds = null,
    string? AudioUrl = null,
    Stream? AudioStream = null,
    string? FileName = null,
    bool IsPublic = true,
    string? Zone = null,
    string? Language = null,        // whisper/wizper: language code; elevenlabs: language_code
    bool? Diarize = null,           // whisper/elevenlabs: speaker diarization
    string? Task = null,            // whisper/wizper: "transcribe" | "translate"
    bool? TagAudioEvents = null     // elevenlabs: tag laughter, applause, etc.
) : IRequest<GenerationResponse>;
