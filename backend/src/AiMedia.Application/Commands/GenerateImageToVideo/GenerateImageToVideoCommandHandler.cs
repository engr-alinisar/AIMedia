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
    ICreditService creditService) : IRequestHandler<GenerateImageToVideoCommand, GenerationResponse>
{
    public async Task<GenerationResponse> Handle(GenerateImageToVideoCommand request, CancellationToken cancellationToken)
    {
        var model = ModelRegistry.Get(request.ModelId)
            ?? throw new InvalidOperationException($"Unknown model: {request.ModelId}");

        var credits = ModelRegistry.CalculateCredits(request.ModelId, request.DurationSeconds);

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();
        var isKlingV3  = request.ModelId.Contains("kling-video/v3");
        var isKling    = request.ModelId.Contains("kling-video");
        var isVeo      = request.ModelId.Contains("veo3");
        var isWan      = request.ModelId.Contains("wan");
        // MiniMax/Hailuo — everything else

        object input = isKlingV3
            ? (object)new                                   // v3: start_image_url, shot_type for multi-shot
            {
                start_image_url = request.ImageUrl,
                prompt          = request.Prompt,
                duration        = request.DurationSeconds.ToString(),
                shot_type       = request.MultiShot ? "intelligent" : "customize"
            }
            : isKling
            ? (object)new                                   // v2.1 / v1.6: image_url, duration only
            {
                image_url = request.ImageUrl,
                prompt    = request.Prompt,
                duration  = request.DurationSeconds.ToString()
            }
            : isVeo
            ? (object)new                                   // Veo 3: duration as "Xs", resolution supported
            {
                image_url  = request.ImageUrl,
                prompt     = request.Prompt,
                duration   = $"{request.DurationSeconds}s",
                resolution = request.Resolution
            }
            : isWan
            ? (object)new                                   // WAN: num_frames instead of duration
            {
                image_url  = request.ImageUrl,
                prompt     = request.Prompt,
                num_frames = Math.Clamp(request.DurationSeconds * 16, 17, 161)
            }
            : (object)new                                   // MiniMax/Hailuo: prompt + image_url only
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
