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
    ICreditService creditService) : IRequestHandler<GenerateImageCommand, GenerationResponse>
{
    public async Task<GenerationResponse> Handle(GenerateImageCommand request, CancellationToken cancellationToken)
    {
        var model = ModelRegistry.Get(request.ModelId)
            ?? throw new InvalidOperationException($"Unknown model: {request.ModelId}");

        var credits = ModelRegistry.CalculateImageGenCredits(request.ModelId, request.Quality, request.ImageSize, request.Resolution);

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();

        var isNanoBanana  = request.ModelId.Contains("nano-banana");
        var isImagen      = request.ModelId.Contains("imagen");
        var isSeedream    = request.ModelId.Contains("seedream");
        var isIdeogram    = request.ModelId.Contains("ideogram");
        var isRecraftV3   = request.ModelId.Contains("recraft/v3");
        var isRecraft     = request.ModelId.Contains("recraft");
        var isGptImage    = request.ModelId.Contains("gpt-image");

        object input = isNanoBanana
            ? (object)new
            {
                prompt          = request.Prompt,
                aspect_ratio    = request.AspectRatio ?? "1:1",
                resolution      = string.IsNullOrEmpty(request.Resolution) ? null : request.Resolution,
            }
            : isImagen && request.ModelId.Contains("imagen4")
            ? (object)new
            {
                prompt           = request.Prompt,
                aspect_ratio     = request.AspectRatio ?? "1:1",
                resolution       = request.Resolution ?? "1K",
                safety_tolerance = "4"
            }
            : isImagen
            ? (object)new
            {
                prompt          = request.Prompt,
                aspect_ratio    = request.AspectRatio ?? "1:1",
                negative_prompt = request.NegativePrompt
            }
            : isSeedream
            ? (object)new
            {
                prompt     = request.Prompt,
                image_size = request.ImageSize
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
            : isRecraftV3
            ? (object)new
            {
                prompt     = request.Prompt,
                image_size = request.ImageSize,
                style      = request.Style ?? "realistic_image"
            }
            : isRecraft
            ? (object)new
            {
                prompt     = request.Prompt,
                image_size = request.ImageSize
            }
            : isGptImage
            ? (object)new
            {
                prompt     = request.Prompt,
                image_size = (request.ImageSize is null or "auto" or "square_hd") ? "1024x1024" : request.ImageSize,
                quality    = request.Quality,          // null → fal.ai uses its own default ("auto")
                background = request.Background        // null → fal.ai uses its own default ("auto")
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
                $"{falClient.WebhookBaseUrl}/api/webhooks/fal?jobId={jobId}",
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
