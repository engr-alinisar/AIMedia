using System.Text.Json;
using AiMedia.Application.Common;
using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using AiMedia.Domain.Enums;
using MediatR;

namespace AiMedia.Application.Commands.GenerateImageToVideo;

public class GenerateImageToVideoCommandHandler(
    IAppDbContext db,
    IFalClient falClient,
    ICreditService creditService,
    IModelPricingService pricing) : IRequestHandler<GenerateImageToVideoCommand, GenerationResponse>
{
    public async Task<GenerationResponse> Handle(GenerateImageToVideoCommand request, CancellationToken cancellationToken)
    {
        var model = ModelRegistry.Get(request.ModelId)
            ?? throw new InvalidOperationException($"Unknown model: {request.ModelId}");

        var credits = await pricing.GetVideoCreditsAsync(request.ModelId, request.DurationSeconds, request.GenerateAudio, request.Resolution, cancellationToken);

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();
        // Identify model family
        var isKlingV3    = request.ModelId.Contains("/v3/");       // start_image_url + shot_type, dur 3-15
        var isKlingV26   = request.ModelId.Contains("/v2.6/");     // start_image_url, generate_audio, dur 5/10
        var isKlingO3    = request.ModelId.Contains("/o3/");       // image_url + shot_type, dur 3-15
        var isKling      = request.ModelId.Contains("kling-video");// v2.5-turbo catch-all
        var isVeo31Fast  = request.ModelId.Contains("veo3.1") && request.ModelId.Contains("fast");
        var isVeo31      = request.ModelId.Contains("veo3.1") && !request.ModelId.Contains("fast");
        var isVeo3Fast   = request.ModelId.Contains("veo3/fast");                                   // Veo 3 Fast (same input as Veo 3)
        var isVeo3       = request.ModelId.Contains("veo3") && !request.ModelId.Contains("veo3.1") && !request.ModelId.Contains("veo3/fast");
        var isWan        = request.ModelId.Contains("wan");
        var isHailuo2    = request.ModelId.Contains("hailuo-02");  // Hailuo 2.0: duration + resolution
        var isHailuo23   = request.ModelId.Contains("hailuo-2.3"); // Hailuo 2.3: prompt + image_url only

        object input = isKlingV3
            ? (object)new                                    // v3: start_image_url, shot_type, audio, aspect_ratio
            {
                start_image_url = request.ImageUrl,
                prompt          = request.MultiPrompts is { Count: > 0 } && request.MultiShot
                                    ? (object?)null : request.Prompt,
                multi_prompt    = request.MultiPrompts is { Count: > 0 } && request.MultiShot
                                    ? request.MultiPrompts.Select(p => new
                                    {
                                        prompt   = p,
                                        duration = (request.DurationSeconds / request.MultiPrompts.Count).ToString()
                                    }).ToList() : null,
                duration        = request.DurationSeconds.ToString(),
                shot_type       = request.MultiPrompts is { Count: > 0 } && request.MultiShot ? "customize" : (string?)null,
                generate_audio  = request.GenerateAudio,
                aspect_ratio    = request.AspectRatio,
                end_image_url   = request.EndImageUrl,
                negative_prompt = request.NegativePrompt,
                cfg_scale       = request.CfgScale ?? 0.5f,
                elements        = request.Elements is { Count: > 0 }
                    ? request.Elements.Select(e =>
                    {
                        if (e.VideoUrl is not null)
                            return (object)new { video_url = e.VideoUrl };
                        // fal.ai requires reference_image_urls to be non-empty;
                        // fall back to frontal image when user provides no references
                        var refs = e.ReferenceImages is { Count: > 0 }
                            ? e.ReferenceImages
                            : new List<string> { e.ImageUrl! };
                        return (object)new { frontal_image_url = e.ImageUrl, reference_image_urls = refs };
                    }).ToList()
                    : null
            }
            : isKlingV26
            ? (object)new                                    // v2.6: start_image_url, audio, aspect_ratio
            {
                start_image_url = request.ImageUrl,
                prompt          = request.Prompt,
                duration        = request.DurationSeconds.ToString(),
                generate_audio  = request.GenerateAudio,
                aspect_ratio    = request.AspectRatio
            }
            : isKlingO3
            ? (object)new                                    // o3: image_url, shot_type, audio, multi_prompt, end_image
            {
                image_url       = request.ImageUrl,
                prompt          = request.MultiPrompts is { Count: > 0 } && request.MultiShot
                                    ? (object?)null : request.Prompt,
                multi_prompt    = request.MultiPrompts is { Count: > 0 } && request.MultiShot
                                    ? request.MultiPrompts.Select(p => new
                                    {
                                        prompt   = p,
                                        duration = (request.DurationSeconds / request.MultiPrompts.Count).ToString()
                                    }).ToList() : null,
                duration        = request.DurationSeconds.ToString(),
                shot_type       = request.MultiPrompts is { Count: > 0 } && request.MultiShot ? "customize" : (string?)null,
                generate_audio  = request.GenerateAudio,
                aspect_ratio    = request.AspectRatio,
                end_image_url   = request.EndImageUrl
            }
            : isKling
            ? (object)new                                    // v2.5-turbo: image_url, negative_prompt, end_image, cfg_scale
            {
                image_url       = request.ImageUrl,
                prompt          = request.Prompt,
                duration        = request.DurationSeconds.ToString(),
                aspect_ratio    = request.AspectRatio,
                negative_prompt = request.NegativePrompt,
                end_image_url   = request.EndImageUrl,
                cfg_scale       = request.CfgScale ?? 0.5f
            }
            : isVeo31Fast
            ? (object)new                                    // Veo 3.1 Fast: first_frame_url + last_frame_url
            {
                first_frame_url = request.ImageUrl,
                last_frame_url  = request.EndImageUrl,
                prompt          = request.Prompt,
                duration        = $"{request.DurationSeconds}s",
                resolution      = request.Resolution,
                aspect_ratio    = request.AspectRatio,
                generate_audio  = request.GenerateAudio
            }
            : isVeo31
            ? (object)new                                    // Veo 3.1: image_url, duration, resolution, audio, neg prompt, seed, auto_fix
            {
                image_url       = request.ImageUrl,
                prompt          = request.Prompt,
                duration        = $"{request.DurationSeconds}s",
                resolution      = request.Resolution,
                aspect_ratio    = request.AspectRatio,
                generate_audio  = request.GenerateAudio,
                negative_prompt = request.NegativePrompt,
                seed            = request.Seed,
                auto_fix        = request.AutoFix
            }
            : isVeo3Fast
            ? (object)new                                    // Veo 3 Fast: same shape as Veo 3, faster/cheaper
            {
                image_url      = request.ImageUrl,
                prompt         = request.Prompt,
                duration       = $"{request.DurationSeconds}s",
                resolution     = request.Resolution,
                aspect_ratio   = request.AspectRatio,
                generate_audio = request.GenerateAudio
            }
            : isVeo3
            ? (object)new                                    // Veo 3: duration "Xs", resolution, aspect_ratio, audio
            {
                image_url      = request.ImageUrl,
                prompt         = request.Prompt,
                duration       = $"{request.DurationSeconds}s",
                resolution     = request.Resolution,
                aspect_ratio   = request.AspectRatio,
                generate_audio = request.GenerateAudio
            }
            : isWan
            ? (object)new                                    // WAN: num_frames, aspect_ratio
            {
                image_url    = request.ImageUrl,
                prompt       = request.Prompt,
                num_frames   = Math.Clamp(request.DurationSeconds * 16, 17, 161),
                aspect_ratio = request.AspectRatio
            }
            : isHailuo2
            ? (object)new                                    // Hailuo 2.0: duration, resolution, prompt_optimizer
            {
                image_url        = request.ImageUrl,
                prompt           = request.Prompt,
                duration         = request.DurationSeconds.ToString(),
                resolution       = request.Resolution ?? "768P",
                prompt_optimizer = request.PromptOptimizer
            }
            : isHailuo23
            ? (object)new                                    // Hailuo 2.3 Pro: prompt + image_url + optimizer
            {
                image_url        = request.ImageUrl,
                prompt           = request.Prompt,
                prompt_optimizer = request.PromptOptimizer
            }
            : (object)new                                    // legacy MiniMax v01 fallback
            {
                image_url = request.ImageUrl,
                prompt    = request.Prompt
            };

        await creditService.ReserveAsync(request.UserId, jobId, credits, $"Image-to-video ({model.Name})", cancellationToken);

        FalSubmitResult falSubmit;
        try
        {
            falSubmit = await falClient.SubmitJobAsync(request.ModelId, input, $"{falClient.WebhookBaseUrl}/api/webhooks/fal?jobId={jobId}", cancellationToken);
        }
        catch
        {
            await creditService.ReleaseAsync(request.UserId, jobId, credits, "Job submission failed", cancellationToken);
            throw;
        }

        db.GenerationJobs.Add(new GenerationJob
        {
            Id = jobId,
            UserId = request.UserId,
            Product = ProductType.ImageToVideo,
            Tier = model.Tier,
            FalEndpoint = request.ModelId,
            FalRequestId = falSubmit.RequestId,
            FalStatusUrl = falSubmit.StatusUrl,
            FalResponseUrl = falSubmit.ResponseUrl,
            Status = JobStatus.Queued,
            CreditsReserved = credits,
            DurationSeconds = request.DurationSeconds,
            FalInput = JsonDocument.Parse(JsonSerializer.Serialize(input)),
            IsPublic = request.IsPublic,
            Zone = request.Zone,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);
        return new GenerationResponse(jobId, credits, request.DurationSeconds * 10);
    }
}
