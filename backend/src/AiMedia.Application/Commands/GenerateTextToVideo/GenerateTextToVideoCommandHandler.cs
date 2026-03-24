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
        var isVeo = request.ModelId.Contains("veo3");
        object input = isKling
            ? new
            {
                prompt = request.Prompt,
                duration = request.DurationSeconds.ToString(),
                aspect_ratio = request.AspectRatio,
                resolution = request.Resolution,
                mode = request.MultiShot ? "pro" : "std"
            }
            : isVeo
            ? new
            {
                prompt = request.Prompt,
                duration = $"{request.DurationSeconds}s",   // Veo 3 requires "8s" format
                aspect_ratio = request.AspectRatio,
                resolution = request.Resolution
            }
            : (object)new { prompt = request.Prompt, duration = request.DurationSeconds, aspect_ratio = request.AspectRatio };

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
