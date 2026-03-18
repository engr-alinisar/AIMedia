using AiMedia.Application.DTOs;
using AiMedia.Domain.Enums;
using MediatR;

namespace AiMedia.Application.Commands.GenerateVoice;

public record GenerateVoiceCommand(
    Guid UserId,
    string Text,
    ModelTier Tier,
    string? VoiceId = null,
    Guid? VoiceCloneId = null) : IRequest<GenerationResponse>;
