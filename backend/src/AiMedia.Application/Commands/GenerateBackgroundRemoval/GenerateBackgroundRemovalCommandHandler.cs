using System.Text.Json;
using AiMedia.Application.Common;
using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using AiMedia.Domain.Enums;
using MediatR;

namespace AiMedia.Application.Commands.GenerateBackgroundRemoval;

public class GenerateBackgroundRemovalCommandHandler(
    IAppDbContext db,
    IFalClient falClient,
    ICreditService creditService,
    IStorageService storage,
    IModelPricingService pricing) : IRequestHandler<GenerateBackgroundRemovalCommand, GenerationResponse>
{
    public async Task<GenerationResponse> Handle(GenerateBackgroundRemovalCommand request, CancellationToken cancellationToken)
    {
        var model = ModelRegistry.Get(request.ModelId)
            ?? throw new InvalidOperationException($"Unknown model: {request.ModelId}");

        // Variable pricing: Ideogram speed tiers — TURBO=6, BALANCED=12, QUALITY=18
        var credits = await pricing.GetImageStudioCreditsAsync(request.ModelId, request.RenderingSpeed, cancellationToken);

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();

        // Upload primary image if provided as stream
        string imageUrl = request.ImageUrl ?? string.Empty;
        if (request.ImageStream != null && request.FileName != null)
        {
            var key = storage.BuildKey(request.UserId, jobId, request.FileName);
            await storage.UploadAsync(request.ImageStream, key, "image/jpeg", cancellationToken);
            imageUrl = storage.GetPublicUrl(key);
        }

        // Upload secondary image if provided as stream (virtual try-on, product integration, face-to-portrait)
        string secondaryImageUrl = request.SecondaryImageUrl ?? string.Empty;
        if (request.SecondaryImageStream != null && request.SecondaryFileName != null)
        {
            var key2 = storage.BuildKey(request.UserId, jobId, "secondary_" + request.SecondaryFileName);
            await storage.UploadAsync(request.SecondaryImageStream, key2, "image/jpeg", cancellationToken);
            secondaryImageUrl = storage.GetPublicUrl(key2);
        }

        object input = request.ModelId switch
        {
            // ── Background Remove ────────────────────────────────────────────────────
            "fal-ai/birefnet" or
            "fal-ai/pixelcut/remove-background" =>
                new { image_url = imageUrl },

            "fal-ai/bria/background/remove" =>
                new { image_url = imageUrl },

            "pixelcut/background-removal" =>
                new { image_url = imageUrl, output_format = "rgba" },

            // ── Background Replace ───────────────────────────────────────────────────
            "fal-ai/bria/background/replace" =>
                string.IsNullOrEmpty(request.SecondaryImageUrl)
                    ? (object)new { image_url = imageUrl, prompt = request.Prompt ?? "", negative_prompt = request.NegativePrompt ?? "", refine_prompt = true, fast = true }
                    : new { image_url = imageUrl, ref_image_url = secondaryImageUrl, refine_prompt = true, fast = true },


            // ── Photo Editing ─────────────────────────────────────────────────────────
            "fal-ai/image-editing/object-removal" =>
                new
                {
                    image_url = imageUrl,
                    prompt = request.Prompt ?? "background",
                    guidance_scale = 3.5,
                    num_inference_steps = 30,
                    output_format = "jpeg"
                },

            "fal-ai/ideogram/v3/edit" =>
                new
                {
                    image_url = imageUrl,
                    mask_url = request.MaskUrl ?? "",
                    prompt = request.Prompt ?? "",
                    rendering_speed = request.RenderingSpeed ?? "BALANCED",
                    expand_prompt = true
                },

            "fal-ai/iclight-v2" =>
                new
                {
                    image_url = imageUrl,
                    prompt = request.Prompt ?? "",
                    negative_prompt = request.NegativePrompt ?? "",
                    image_size = request.ImageSize ?? "portrait_4_3",
                    num_inference_steps = 28,
                    output_format = "jpeg"
                },

            // ── Portrait & Beauty ────────────────────────────────────────────────────
            "fal-ai/image-apps-v2/headshot-photo" =>
                new
                {
                    image_url = imageUrl,
                    background_style = request.BackgroundStyle ?? "professional",
                    aspect_ratio = "3:4"
                },

            "fal-ai/image-apps-v2/makeup-application" =>
                new
                {
                    image_url = imageUrl,
                    makeup_style = request.MakeupStyle ?? "natural",
                    intensity = request.MakeupIntensity ?? "medium",
                    aspect_ratio = "3:4"
                },

            // ── Creative Styles ──────────────────────────────────────────────────────
            "fal-ai/flux-2-lora-gallery/ballpoint-pen-sketch" =>
                new
                {
                    image_urls = new[] { imageUrl },
                    prompt = $"b4llp01nt {request.Prompt ?? "portrait"}",
                    image_size = request.ImageSize ?? "portrait_4_3",
                    guidance_scale = 2.5,
                    num_inference_steps = 40,
                    lora_scale = 1.0
                },

            "fal-ai/flux-2-lora-gallery/digital-comic-art" =>
                new
                {
                    image_urls = new[] { imageUrl },
                    prompt = $"d1g1t4l {request.Prompt ?? "comic art style"}",
                    image_size = request.ImageSize ?? "portrait_4_3",
                    guidance_scale = 2.5,
                    num_inference_steps = 40,
                    lora_scale = 1.0
                },

            "fal-ai/flux-2-lora-gallery/sepia-vintage" =>
                new
                {
                    prompt = request.Prompt ?? "vintage portrait",
                    image_size = request.ImageSize ?? "portrait_4_3",
                    guidance_scale = 2.5,
                    num_inference_steps = 40,
                    lora_scale = 1.0
                },

            // ── Transform ────────────────────────────────────────────────────────────
            "fal-ai/flux-2-lora-gallery/face-to-full-portrait" =>
                new
                {
                    image_urls = new[] { imageUrl },
                    prompt = request.Prompt ?? "Face to full portrait",
                    image_size = request.ImageSize ?? "portrait_4_3",
                    guidance_scale = 2.5,
                    num_inference_steps = 40,
                    lora_scale = 1.0
                },

            "fal-ai/flux-2-lora-gallery/virtual-tryon" =>
                new
                {
                    image_urls = new[] { imageUrl, secondaryImageUrl },
                    prompt = request.Prompt ?? "person wearing the garment, natural pose, realistic",
                    image_size = request.ImageSize ?? "portrait_4_3",
                    guidance_scale = 2.5,
                    num_inference_steps = 40,
                    lora_scale = 1.0
                },

            "fal-ai/qwen-image-edit-plus-lora-gallery/integrate-product" =>
                new
                {
                    image_urls = new[] { imageUrl },
                    prompt = request.Prompt ?? "Blend and integrate the product into the background",
                    image_size = request.ImageSize ?? "square_hd",
                    guidance_scale = 1.0,
                    num_inference_steps = 6,
                    lora_scale = 1.0
                },

            _ => (object)new { image_url = imageUrl }
        };

        await creditService.ReserveAsync(request.UserId, jobId, credits, $"Image Studio ({model.Name})", cancellationToken);

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
            Id = jobId,
            UserId = request.UserId,
            Product = ProductType.BackgroundRemoval,
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
        });

        await db.SaveChangesAsync(cancellationToken);
        return new GenerationResponse(jobId, credits, 10);
    }
}
