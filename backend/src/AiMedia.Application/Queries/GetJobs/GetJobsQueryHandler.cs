using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Application.Queries.GetJobs;

public class GetJobsQueryHandler(IAppDbContext db, IStorageService storage) : IRequestHandler<GetJobsQuery, PagedResult<JobDto>>
{
    public async Task<PagedResult<JobDto>> Handle(GetJobsQuery request, CancellationToken cancellationToken)
    {
        var query = db.GenerationJobs
            .Where(j => j.UserId == request.UserId)
            .OrderByDescending(j => j.CreatedAt);

        var total = await query.CountAsync(cancellationToken);
        var jobs = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<JobDto>
        {
            Items = jobs.Select(j => new JobDto
            {
                Id = j.Id,
                Product = j.Product,
                Tier = j.Tier,
                Status = j.Status,
                CreditsReserved = j.CreditsReserved,
                CreditsCharged = j.CreditsCharged,
                OutputUrl = j.OutputR2Key != null ? storage.GetPublicUrl(j.OutputR2Key) : null,
                ErrorMessage = j.ErrorMessage,
                DurationSeconds = j.DurationSeconds,
                CreatedAt = j.CreatedAt,
                CompletedAt = j.CompletedAt
            }).ToList(),
            TotalCount = total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
