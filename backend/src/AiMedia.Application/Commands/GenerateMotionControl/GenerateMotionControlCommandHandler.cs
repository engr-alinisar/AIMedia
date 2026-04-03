using System.Text.Json;
using AiMedia.Application.Common;
using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using AiMedia.Domain.Enums;
using MediatR;

namespace AiMedia.Application.Commands.GenerateMotionControl;

public class GenerateMotionControlCommandHandler(
    IAppDbContext db,
    IFalClient falClient,
    ICreditService creditService,
    IModelPricingService pricing) : IRequestHandler<GenerateMotionControlCommand, GenerationResponse>
{
    public async Task<GenerationResponse> Handle(GenerateMotionControlCommand request, CancellationToken cancellationToken)
    {
        var model = ModelRegistry.Get(request.ModelId)
            ?? throw new InvalidOperationException($"Unknown model: {request.ModelId}");

        var orientation = request.CharacterOrientation.Trim().ToLowerInvariant();
        if (orientation is not ("image" or "video"))
            throw new InvalidOperationException("Character orientation must be either 'image' or 'video'.");

        var maxDuration = orientation == "image" ? 10 : 30;
        if (request.DurationSeconds <= 0 || request.DurationSeconds > maxDuration)
            throw new InvalidOperationException($"Reference video must be between 1 and {maxDuration} seconds for '{orientation}' orientation.");

        var isV3Pro = string.Equals(request.ModelId, "fal-ai/kling-video/v3/pro/motion-control", StringComparison.Ordinal);
        if (!string.IsNullOrWhiteSpace(request.ElementImageUrl))
        {
            if (!isV3Pro)
                throw new InvalidOperationException("Element binding is only supported for Kling v3 Pro Motion Control.");
            if (orientation != "video")
                throw new InvalidOperationException("Element binding requires character orientation to be set to 'video'.");
        }

        var credits = await pricing.GetMotionControlCreditsAsync(request.ModelId, request.DurationSeconds, cancellationToken);
        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        object input = isV3Pro
            ? new
            {
                prompt = request.Prompt,
                image_url = request.ImageUrl,
                video_url = request.VideoUrl,
                keep_original_sound = request.KeepOriginalSound,
                character_orientation = orientation,
                elements = !string.IsNullOrWhiteSpace(request.ElementImageUrl)
                    ? new[] { new { image_url = request.ElementImageUrl } }
                    : null
            }
            : new
            {
                prompt = request.Prompt,
                image_url = request.ImageUrl,
                video_url = request.VideoUrl,
                keep_original_sound = request.KeepOriginalSound,
                character_orientation = orientation
            };

        var jobId = Guid.NewGuid();
        await creditService.ReserveAsync(request.UserId, jobId, credits, $"Motion control ({model.Name})", cancellationToken);

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
            Product = ProductType.MotionControl,
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
