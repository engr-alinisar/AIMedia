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
        // Build model-specific input payload
        var isKling = request.ModelId.Contains("kling-video");
        var isVeo = request.ModelId.Contains("veo3");
        object input = isKling
            ? new
            {
                image_url = request.ImageUrl,
                prompt = request.Prompt,
                duration = request.DurationSeconds.ToString(),
                resolution = request.Resolution,
                // Kling v3 Pro multi-shot mode: "std" = single shot, "pro" = multi-shot
                mode = (request.MultiShot && request.ModelId.Contains("/v3/")) ? "pro" : "std"
            }
            : isVeo
            ? new
            {
                image_url = request.ImageUrl,
                prompt = request.Prompt,
                duration = $"{request.DurationSeconds}s",   // Veo 3 requires "8s" format
                resolution = request.Resolution
            }
            : (object)new { image_url = request.ImageUrl, prompt = request.Prompt, duration = request.DurationSeconds.ToString() };

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
