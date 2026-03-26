using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Application.Queries.GetVoiceClones;

public class GetVoiceClonesQueryHandler(IAppDbContext db) : IRequestHandler<GetVoiceClonesQuery, List<VoiceCloneDto>>
{
    public async Task<List<VoiceCloneDto>> Handle(GetVoiceClonesQuery request, CancellationToken cancellationToken)
    {
        return await db.VoiceClones
            .Where(v => v.UserId == request.UserId)
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new VoiceCloneDto
            {
                Id = v.Id,
                Name = v.Name,
                FalVoiceId = v.FalVoiceId,
                CreatedAt = v.CreatedAt,
                LastUsedAt = v.LastUsedAt
            })
            .ToListAsync(cancellationToken);
    }
}
