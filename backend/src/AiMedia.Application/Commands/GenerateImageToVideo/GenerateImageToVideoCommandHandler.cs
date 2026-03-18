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
        var credits = CreditCalculator.Calculate(ProductType.ImageToVideo, request.Tier, request.DurationSeconds);

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();
        var input = new { image_url = request.ImageUrl, prompt = request.Prompt, duration = request.DurationSeconds };

        await creditService.ReserveAsync(request.UserId, jobId, credits, $"Image-to-video ({request.Tier})", cancellationToken);

        string falRequestId;
        try
        {
            falRequestId = await falClient.SubmitJobAsync(GetEndpoint(request.Tier), input, $"WEBHOOK_PLACEHOLDER/{jobId}", cancellationToken);
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
            Tier = request.Tier,
            FalEndpoint = GetEndpoint(request.Tier),
            FalRequestId = falRequestId,
            Status = JobStatus.Queued,
            CreditsReserved = credits,
            DurationSeconds = request.DurationSeconds,
            FalInput = JsonDocument.Parse(JsonSerializer.Serialize(input)),
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);
        return new GenerationResponse(jobId, credits, request.DurationSeconds * 10);
    }

    private static string GetEndpoint(ModelTier tier) => tier switch
    {
        ModelTier.Free     => "fal-ai/wan/i2v",
        ModelTier.Standard => "fal-ai/kling-video/v3/pro/image-to-video",
        ModelTier.Premium  => "fal-ai/veo3/image-to-video",
        _ => "fal-ai/wan/i2v"
    };
}
