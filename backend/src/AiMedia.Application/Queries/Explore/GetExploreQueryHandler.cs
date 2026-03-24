using System.Text.Json;
using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Application.Queries.Explore;

public class GetExploreQueryHandler(IAppDbContext db) : IRequestHandler<GetExploreQuery, PagedResult<ExploreItemDto>>
{
    public async Task<PagedResult<ExploreItemDto>> Handle(GetExploreQuery request, CancellationToken cancellationToken)
    {
        var query = db.GenerationJobs
            .Include(j => j.User)
            .Where(j => j.IsPublic && j.Status == JobStatus.Completed && j.OutputUrl != null);

        if (!string.IsNullOrWhiteSpace(request.Zone))
        {
            query = query.Where(j => j.Zone == request.Zone);
        }

        var orderedQuery = query.OrderByDescending(j => j.CreatedAt);

        var total = await orderedQuery.CountAsync(cancellationToken);
        var jobs = await orderedQuery
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var items = jobs.Select(j =>
        {
            string? prompt = null;

            if (j.FalInput != null)
            {
                try
                {
                    var root = j.FalInput.RootElement;
                    if (root.TryGetProperty("prompt", out var promptProp))
                        prompt = promptProp.GetString();
                    else if (root.TryGetProperty("text", out var textProp))
                        prompt = textProp.GetString();
                    else if (root.TryGetProperty("gen_text", out var genTextProp))
                        prompt = genTextProp.GetString();
                }
                catch (JsonException) { }
            }

            var displayName = "User";
            if (!string.IsNullOrWhiteSpace(j.User?.FullName))
            {
                var parts = j.User.FullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                displayName = parts.Length > 0 ? parts[0] : "User";
            }

            return new ExploreItemDto(
                j.Id,
                j.Product.ToString(),
                j.OutputUrl,
                prompt,
                j.FalEndpoint,
                j.CreatedAt,
                displayName,
                j.Zone
            );
        }).ToList();

        return new PagedResult<ExploreItemDto>
        {
            Items = items,
            TotalCount = total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}
