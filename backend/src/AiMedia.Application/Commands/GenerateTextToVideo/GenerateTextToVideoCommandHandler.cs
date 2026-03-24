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
    ICreditService creditService) : IRequestHandler<GenerateTextToVideoCommand, GenerationResponse>
{
    public async Task<GenerationResponse> Handle(GenerateTextToVideoCommand request, CancellationToken cancellationToken)
    {
        var model = ModelRegistry.Get(request.ModelId)
            ?? throw new InvalidOperationException($"Unknown model: {request.ModelId}");

        var credits = ModelRegistry.CalculateCredits(request.ModelId, request.DurationSeconds);

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();
        var isKling = request.ModelId.Contains("kling-video");
        var isVeo   = request.ModelId.Contains("veo3");
        var isWan   = request.ModelId.Contains("wan");

        object input = isKling
            ? (object)new                                   // Kling: shot_type for multi-shot, no resolution
            {
                prompt       = request.Prompt,
                duration     = request.DurationSeconds.ToString(),
                aspect_ratio = request.AspectRatio,
                shot_type    = request.MultiShot ? "intelligent" : "customize"
            }
            : isVeo
            ? (object)new                                   // Veo 3: duration as "Xs", resolution supported
            {
                prompt       = request.Prompt,
                duration     = $"{request.DurationSeconds}s",
                aspect_ratio = request.AspectRatio,
                resolution   = request.Resolution
            }
            : isWan
            ? (object)new                                   // WAN: num_frames instead of duration
            {
                prompt       = request.Prompt,
                num_frames   = Math.Clamp(request.DurationSeconds * 16, 17, 161),
                aspect_ratio = request.AspectRatio
            }
            : (object)new
            {
                prompt       = request.Prompt,
                duration     = request.DurationSeconds,
                aspect_ratio = request.AspectRatio
            };

        await creditService.ReserveAsync(request.UserId, jobId, credits, $"Text-to-video ({model.Name})", cancellationToken);

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
            Product = ProductType.TextToVideo,
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
