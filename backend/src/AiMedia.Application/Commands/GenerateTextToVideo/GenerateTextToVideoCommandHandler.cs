using System.Text.Json;
using AiMedia.Application.Common;
using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using AiMedia.Domain.Enums;
using MediatR;

namespace AiMedia.Application.Commands.GenerateTextToVideo;

public class GenerateTextToVideoCommandHandler(
    IAppDbContext db,
    IFalClient falClient,
    ICreditService creditService,
    IModelPricingService pricing) : IRequestHandler<GenerateTextToVideoCommand, GenerationResponse>
{
    public async Task<GenerationResponse> Handle(GenerateTextToVideoCommand request, CancellationToken cancellationToken)
    {
        // Model detection
        var isKling     = request.ModelId.Contains("kling-video");
        var isKlingV3   = isKling && request.ModelId.Contains("/v3/");
        var isKlingO3   = isKling && request.ModelId.Contains("/o3/");
        var isKlingV26  = isKling && request.ModelId.Contains("/v2.6/");
        var isHailuo23  = request.ModelId.Contains("hailuo-2.3");
        var isHailuo2   = request.ModelId.Contains("hailuo-02");
        var isVeo31Fast = request.ModelId.Contains("veo3.1") && request.ModelId.Contains("/fast");
        var isVeo31     = request.ModelId.Contains("veo3.1") && !request.ModelId.Contains("/fast");
        var isVeo3Fast  = request.ModelId == "fal-ai/veo3/fast";
        var isVeo3      = request.ModelId.Contains("veo3") && !request.ModelId.Contains("veo3.1") && !isVeo3Fast;
        var isWan       = request.ModelId.Contains("wan");

        var model = ModelRegistry.Get(request.ModelId)
            ?? throw new InvalidOperationException($"Unknown model: {request.ModelId}");

        var credits = await pricing.GetVideoCreditsAsync(request.ModelId, request.DurationSeconds, request.GenerateAudio, request.Resolution, cancellationToken);

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();

        object input;

        if (isKlingV3)
        {
            var hasSegments = request.MultiPrompts is { Count: > 1 };
            input = new
            {
                prompt          = hasSegments ? (string?)null : request.Prompt,
                multi_prompt    = hasSegments
                    ? request.MultiPrompts!.Select(p => new
                    {
                        prompt   = p,
                        duration = (request.DurationSeconds / request.MultiPrompts!.Count).ToString()
                    }).ToList()
                    : (object?)null,
                duration        = request.DurationSeconds.ToString(),
                shot_type       = hasSegments ? "customize"
                                : request.MultiShot ? "intelligent"
                                : (string?)null,
                generate_audio  = request.GenerateAudio,
                aspect_ratio    = request.AspectRatio,
                negative_prompt = !string.IsNullOrWhiteSpace(request.NegativePrompt)
                                    ? request.NegativePrompt
                                    : "blur, distort, and low quality",
                cfg_scale       = request.CfgScale ?? 0.5f,
            };
        }
        else if (isKlingO3)
        {
            // o3: supports negative_prompt but not cfg_scale
            var hasSegments = request.MultiPrompts is { Count: > 1 };
            input = new
            {
                prompt          = hasSegments ? (string?)null : request.Prompt,
                multi_prompt    = hasSegments
                    ? request.MultiPrompts!.Select(p => new
                    {
                        prompt   = p,
                        duration = (request.DurationSeconds / request.MultiPrompts!.Count).ToString()
                    }).ToList()
                    : (object?)null,
                duration        = request.DurationSeconds.ToString(),
                shot_type       = hasSegments ? "customize"
                                : request.MultiShot ? "intelligent"
                                : (string?)null,
                generate_audio  = request.GenerateAudio,
                aspect_ratio    = request.AspectRatio,
                negative_prompt = !string.IsNullOrWhiteSpace(request.NegativePrompt)
                                    ? request.NegativePrompt
                                    : "blur, distort, and low quality",
            };
        }
        else if (isKlingV26)
        {
            // v2.6: audio + aspect_ratio + negative_prompt + cfg_scale
            input = new
            {
                prompt          = request.Prompt,
                duration        = request.DurationSeconds.ToString(),
                generate_audio  = request.GenerateAudio,
                aspect_ratio    = request.AspectRatio,
                negative_prompt = !string.IsNullOrWhiteSpace(request.NegativePrompt)
                                    ? request.NegativePrompt
                                    : "blur, distort, and low quality",
                cfg_scale       = request.CfgScale ?? 0.5f,
            };
        }
        else if (isKling)
        {
            // v2.5-turbo: aspect_ratio + duration + negative_prompt + cfg_scale (no audio)
            input = new
            {
                prompt          = request.Prompt,
                duration        = request.DurationSeconds.ToString(),
                aspect_ratio    = request.AspectRatio,
                negative_prompt = !string.IsNullOrWhiteSpace(request.NegativePrompt)
                                    ? request.NegativePrompt
                                    : "blur, distort, and low quality",
                cfg_scale       = request.CfgScale ?? 0.5f,
            };
        }
        else if (isHailuo23)
        {
            // Hailuo 2.3 Pro: prompt + optimizer only (no duration or aspect_ratio)
            input = new
            {
                prompt           = request.Prompt,
                prompt_optimizer = request.PromptOptimizer,
            };
        }
        else if (isHailuo2)
        {
            // Hailuo 2.0 Standard: duration as string "6" or "10"
            input = new
            {
                prompt           = request.Prompt,
                duration         = request.DurationSeconds.ToString(),
                prompt_optimizer = true,
            };
        }
        else if (isVeo31Fast || isVeo31 || isVeo3Fast || isVeo3)
        {
            // All Veo models: duration as "Xs", aspect_ratio, resolution, audio, negative_prompt, seed, auto_fix
            input = new
            {
                prompt          = request.Prompt,
                duration        = $"{request.DurationSeconds}s",
                aspect_ratio    = request.AspectRatio,
                resolution      = request.Resolution,
                generate_audio  = request.GenerateAudio,
                negative_prompt = !string.IsNullOrWhiteSpace(request.NegativePrompt)
                                    ? request.NegativePrompt
                                    : (string?)null,
                seed            = request.Seed,
                auto_fix        = request.AutoFix,
            };
        }
        else if (isWan)
        {
            // WAN: frame-based duration, resolution as quality param
            input = new
            {
                prompt       = request.Prompt,
                num_frames   = Math.Clamp(request.DurationSeconds * 16, 17, 161),
                aspect_ratio = request.AspectRatio,
                resolution   = request.Resolution,
            };
        }
        else
        {
            input = new
            {
                prompt       = request.Prompt,
                duration     = request.DurationSeconds,
                aspect_ratio = request.AspectRatio,
            };
        }

        await creditService.ReserveAsync(request.UserId, jobId, credits, $"Text-to-video ({model.Name})", cancellationToken);

        FalSubmitResult falSubmit;
        try
        {
            falSubmit = await falClient.SubmitJobAsync(request.ModelId, input, falClient.BuildWebhookUrl(jobId), cancellationToken);
        }
        catch
        {
            await creditService.ReleaseAsync(request.UserId, jobId, credits, "Job submission failed", cancellationToken);
            throw;
        }

        db.GenerationJobs.Add(new GenerationJob
        {
            Id              = jobId,
            UserId          = request.UserId,
            Product         = ProductType.TextToVideo,
            Tier            = model.Tier,
            FalEndpoint     = request.ModelId,
            FalRequestId    = falSubmit.RequestId,
            FalStatusUrl    = falSubmit.StatusUrl,
            FalResponseUrl  = falSubmit.ResponseUrl,
            Status          = JobStatus.Queued,
            CreditsReserved = credits,
            DurationSeconds = request.DurationSeconds,
            FalInput        = JsonDocument.Parse(JsonSerializer.Serialize(input)),
            IsPublic        = request.IsPublic,
            Zone            = request.Zone,
            CreatedAt       = DateTime.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);
        return new GenerationResponse(jobId, credits, request.DurationSeconds * 10);
    }
}
