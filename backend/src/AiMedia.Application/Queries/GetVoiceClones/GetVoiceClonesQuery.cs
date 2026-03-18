using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Queries.GetVoiceClones;

public record GetVoiceClonesQuery(Guid UserId) : IRequest<List<VoiceCloneDto>>;
