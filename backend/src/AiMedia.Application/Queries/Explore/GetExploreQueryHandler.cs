using System.Text.Json;
using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Application.Queries.Explore;

public class GetExploreQueryHandler(IAppDbContext db, IStorageService storage) : IRequestHandler<GetExploreQuery, PagedResult<ExploreItemDto>>
{
    public async Task<PagedResult<ExploreItemDto>> Handle(GetExploreQuery request, CancellationToken cancellationToken)
    {
        var query = db.GenerationJobs
            .Include(j => j.User)
            .Where(j => j.IsPublic && j.Status == JobStatus.Completed && j.OutputR2Key != null);

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
            List<string>? multiPrompts = null;

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

                    // Extract multi_prompt segments
                    if (root.TryGetProperty("multi_prompt", out var mpProp) && mpProp.ValueKind == JsonValueKind.Array)
                    {
                        multiPrompts = new List<string>();
                        foreach (var seg in mpProp.EnumerateArray())
                        {
                            if (seg.TryGetProperty("prompt", out var segPrompt))
                                multiPrompts.Add(segPrompt.GetString() ?? "");
                        }
                        if (multiPrompts.Count == 0) multiPrompts = null;
                    }
                }
                catch (JsonException) { }
            }

            var displayName = "User";
            if (!string.IsNullOrWhiteSpace(j.User?.FullName))
            {
                var parts = j.User.FullName.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                displayName = parts.Length > 0 ? parts[0] : "User";
            }

            var outputUrl = j.OutputR2Key != null ? storage.GetPublicUrl(j.OutputR2Key) : null;

            return new ExploreItemDto(
                j.Id,
                j.Product.ToString(),
                outputUrl,
                prompt,
                j.FalEndpoint,
                j.CreatedAt,
                displayName,
                j.Zone,
                j.Title,
                multiPrompts
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
