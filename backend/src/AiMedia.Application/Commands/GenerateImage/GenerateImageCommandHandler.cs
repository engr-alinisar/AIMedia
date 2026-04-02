using System.Text.Json;
using AiMedia.Application.Common;
using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using AiMedia.Domain.Enums;
using MediatR;

namespace AiMedia.Application.Commands.GenerateImage;

public class GenerateImageCommandHandler(
    IAppDbContext db,
    IFalClient falClient,
    ICreditService creditService,
    IModelPricingService pricing) : IRequestHandler<GenerateImageCommand, GenerationResponse>
{
    public async Task<GenerationResponse> Handle(GenerateImageCommand request, CancellationToken cancellationToken)
    {
        var model = ModelRegistry.Get(request.ModelId)
            ?? throw new InvalidOperationException($"Unknown model: {request.ModelId}");

        var credits = await pricing.GetImageGenCreditsAsync(request.ModelId, request.Quality, request.ImageSize, request.Resolution, request.ThinkingLevel, request.RenderingSpeed, cancellationToken);

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();

        var isNanoBanana  = request.ModelId == "fal-ai/nano-banana";
        var isNanoBanana2 = request.ModelId == "fal-ai/nano-banana-2";
        var isNanoBananaPro = request.ModelId == "fal-ai/nano-banana-pro";
        var isImagen      = request.ModelId.Contains("imagen");
        var isSeedream    = request.ModelId.Contains("seedream");
        var isIdeogram    = request.ModelId.Contains("ideogram");
        var isFluxSchnell = request.ModelId == "fal-ai/flux/schnell";
        var isFluxPro11   = request.ModelId == "fal-ai/flux-pro/v1.1";
        var isFlux2Pro    = request.ModelId == "fal-ai/flux-2-pro";
        var isImagen3Fast = request.ModelId == "fal-ai/imagen3/fast";
        var isImagen4Preview = request.ModelId == "fal-ai/imagen4/preview";
        var isIdeogramV2 = request.ModelId == "fal-ai/ideogram/v2";
        var isIdeogramV3 = request.ModelId == "fal-ai/ideogram/v3";
        var hasCustomSize = request.CustomWidth.HasValue && request.CustomHeight.HasValue;

        object input = isNanoBanana
            ? (object)new
            {
                prompt          = request.Prompt,
                aspect_ratio    = request.AspectRatio ?? "1:1",
                seed            = request.Seed,
                output_format   = request.OutputFormat
            }
            : isNanoBanana2
            ? (object)new
            {
                prompt          = request.Prompt,
                aspect_ratio    = request.AspectRatio ?? "1:1",
                resolution      = string.IsNullOrEmpty(request.Resolution) ? null : request.Resolution,
                seed            = request.Seed,
                output_format   = request.OutputFormat,
                thinking_level  = request.ThinkingLevel
            }
            : isNanoBananaPro
            ? (object)new
            {
                prompt          = request.Prompt,
                aspect_ratio    = request.AspectRatio ?? "1:1",
                resolution      = string.IsNullOrEmpty(request.Resolution) ? null : request.Resolution,
                seed            = request.Seed,
                output_format   = request.OutputFormat
            }
            : isImagen4Preview
            ? (object)new
            {
                prompt = request.Prompt,
                aspect_ratio = request.AspectRatio ?? "1:1",
                resolution = request.Resolution ?? "1K",
                seed = request.Seed,
                output_format = request.OutputFormat,
                safety_tolerance = "4"
            }
            : isImagen3Fast
            ? (object)new
            {
                prompt = request.Prompt,
                aspect_ratio = request.AspectRatio ?? "1:1",
                negative_prompt = request.NegativePrompt,
                seed = request.Seed
            }
            : isImagen
            ? (object)new
            {
                prompt = request.Prompt,
                aspect_ratio = request.AspectRatio ?? "1:1",
                negative_prompt = request.NegativePrompt
            }
            : isSeedream
            ? (object)new
            {
                prompt     = request.Prompt,
                image_size = hasCustomSize
                    ? (object)new { width = request.CustomWidth!.Value, height = request.CustomHeight!.Value }
                    : request.ImageSize!,
                seed       = request.Seed
            }
            : isIdeogramV3
            ? (object)new
            {
                prompt           = request.Prompt,
                image_size       = hasCustomSize
                    ? (object)new { width = request.CustomWidth!.Value, height = request.CustomHeight!.Value }
                    : request.ImageSize!,
                style            = request.Style ?? "AUTO",
                rendering_speed  = request.RenderingSpeed ?? "BALANCED",
                negative_prompt  = request.NegativePrompt,
                expand_prompt    = request.ExpandPrompt ?? true,
                seed             = request.Seed,
                style_preset     = request.StylePreset
            }
            : isIdeogramV2
            ? (object)new
            {
                prompt          = request.Prompt,
                aspect_ratio    = request.AspectRatio ?? "1:1",
                style           = request.Style ?? "auto",
                negative_prompt = request.NegativePrompt,
                expand_prompt   = request.ExpandPrompt ?? true,
                seed            = request.Seed
            }
            : isIdeogram
            ? (object)new
            {
                prompt           = request.Prompt,
                image_size       = request.ImageSize,
                style            = request.Style ?? "AUTO",
                rendering_speed  = "BALANCED",
                negative_prompt  = request.NegativePrompt,
                expand_prompt    = true
            }
            : isFluxSchnell
            ? (object)new
            {
                prompt = request.Prompt,
                image_size = request.ImageSize,
                seed = request.Seed,
                guidance_scale = request.GuidanceScale,
                output_format = request.OutputFormat
            }
            : isFluxPro11
            ? (object)new
            {
                prompt = request.Prompt,
                image_size = request.ImageSize,
                negative_prompt = request.NegativePrompt,
                seed = request.Seed,
                output_format = request.OutputFormat,
                prompt_upsampling = request.EnhancePrompt
            }
            : isFlux2Pro
            ? (object)new
            {
                prompt = request.Prompt,
                image_size = request.ImageSize,
                seed = request.Seed,
                output_format = request.OutputFormat
            }
            : string.IsNullOrEmpty(request.NegativePrompt)
            ? (object)new    // FLUX without negative prompt
            {
                prompt     = request.Prompt,
                image_size = request.ImageSize
            }
            : (object)new    // FLUX with negative prompt
            {
                prompt          = request.Prompt,
                image_size      = request.ImageSize,
                negative_prompt = request.NegativePrompt
            };

        await creditService.ReserveAsync(request.UserId, jobId, credits, $"Image generation ({model.Name})", cancellationToken);

        FalSubmitResult falSubmit;
        try
        {
            falSubmit = await falClient.SubmitJobAsync(
                request.ModelId,
                input,
                falClient.BuildWebhookUrl(jobId),
                cancellationToken);
        }
        catch
        {
            await creditService.ReleaseAsync(request.UserId, jobId, credits, "Job submission failed", cancellationToken);
            throw;
        }

        var job = new GenerationJob
        {
            Id = jobId,
            UserId = request.UserId,
            Product = ProductType.ImageGen,
            Tier = model.Tier,
            FalEndpoint = request.ModelId,
            FalRequestId = falSubmit.RequestId,
            FalStatusUrl = falSubmit.StatusUrl,
            FalResponseUrl = falSubmit.ResponseUrl,
            Status = JobStatus.Queued,
            CreditsReserved = credits,
            FalInput = JsonDocument.Parse(JsonSerializer.Serialize(input)),
            IsPublic = request.IsPublic,
            Zone = request.Zone,
            CreatedAt = DateTime.UtcNow
        };

        db.GenerationJobs.Add(job);
        await db.SaveChangesAsync(cancellationToken);

        return new GenerationResponse(jobId, credits, 15);
    }
}
