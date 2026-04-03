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
            .Where(j => j.Status == JobStatus.Completed && j.OutputR2Key != null);

        // "My Jobs" filter: show all own jobs (public + private); otherwise show only public
        if (request.MyJobsOnly && request.UserId.HasValue)
            query = query.Where(j => j.UserId == request.UserId.Value);
        else
            query = query.Where(j => j.IsPublic);

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

            string? inputImageUrl = null;
            string? inputVideoUrl = null;
            List<ExploreElementDto>? inputElements = null;
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

                    // Extract input image URL (image-to-video models use different field names)
                    foreach (var key in new[] { "image_url", "start_image_url", "first_frame_url" })
                    {
                        if (root.TryGetProperty(key, out var imgProp))
                        {
                            inputImageUrl = imgProp.GetString();
                            break;
                        }
                    }

                    foreach (var key in new[] { "video_url", "reference_video_url" })
                    {
                        if (root.TryGetProperty(key, out var videoProp))
                        {
                            inputVideoUrl = videoProp.GetString();
                            break;
                        }
                    }

                    // Extract Kling elements (frontal + reference images)
                    if (root.TryGetProperty("elements", out var elsProp) && elsProp.ValueKind == JsonValueKind.Array)
                    {
                        inputElements = new List<ExploreElementDto>();
                        foreach (var el in elsProp.EnumerateArray())
                        {
                            var imageUrl = el.TryGetProperty("image_url", out var ip) ? ip.GetString() : null;
                            var frontal = el.TryGetProperty("frontal_image_url", out var fp) ? fp.GetString() : null;
                            List<string>? refs = null;
                            if (el.TryGetProperty("reference_image_urls", out var rp) && rp.ValueKind == JsonValueKind.Array)
                            {
                                refs = rp.EnumerateArray()
                                    .Select(r => r.GetString())
                                    .Where(r => r != null)
                                    .Select(r => r!)
                                    .ToList();
                            }
                            if (imageUrl != null || frontal != null || refs?.Count > 0)
                                inputElements.Add(new ExploreElementDto(imageUrl, frontal, refs));
                        }
                        if (inputElements.Count == 0) inputElements = null;
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
                multiPrompts,
                inputImageUrl,
                inputVideoUrl,
                inputElements,
                j.UserId,
                j.IsPublic
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
