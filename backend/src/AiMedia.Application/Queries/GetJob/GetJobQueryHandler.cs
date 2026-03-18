using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Application.Queries.GetJob;

public class GetJobQueryHandler(IAppDbContext db, IStorageService storage) : IRequestHandler<GetJobQuery, JobDto?>
{
    public async Task<JobDto?> Handle(GetJobQuery request, CancellationToken cancellationToken)
    {
        var job = await db.GenerationJobs
            .FirstOrDefaultAsync(j => j.Id == request.JobId && j.UserId == request.UserId, cancellationToken);

        if (job == null) return null;

        string? outputUrl = null;
        if (job.OutputR2Key != null)
            outputUrl = storage.GetPublicUrl(job.OutputR2Key);

        return new JobDto
        {
            Id = job.Id,
            Product = job.Product,
            Tier = job.Tier,
            Status = job.Status,
            CreditsReserved = job.CreditsReserved,
            CreditsCharged = job.CreditsCharged,
            OutputUrl = outputUrl,
            ErrorMessage = job.ErrorMessage,
            DurationSeconds = job.DurationSeconds,
            CreatedAt = job.CreatedAt,
            CompletedAt = job.CompletedAt
        };
    }
}
