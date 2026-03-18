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
    IStorageService storage) : IRequestHandler<GenerateBackgroundRemovalCommand, GenerationResponse>
{
    public async Task<GenerationResponse> Handle(GenerateBackgroundRemovalCommand request, CancellationToken cancellationToken)
    {
        const int credits = 3; // fixed cost
        const string endpoint = "fal-ai/pixelcut/remove-background";

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();
        string imageUrl = request.ImageUrl ?? string.Empty;

        if (request.ImageStream != null && request.FileName != null)
        {
            var key = storage.BuildKey(request.UserId, jobId, request.FileName);
            await storage.UploadAsync(request.ImageStream, key, "image/png", cancellationToken);
            imageUrl = await storage.GetPresignedUrlAsync(key, TimeSpan.FromHours(1));
        }

        var input = new { image_url = imageUrl };

        await creditService.ReserveAsync(request.UserId, jobId, credits, "Background removal", cancellationToken);

        string falRequestId;
        try
        {
            falRequestId = await falClient.SubmitJobAsync(endpoint, input, $"WEBHOOK_PLACEHOLDER/{jobId}", cancellationToken);
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
            Tier = ModelTier.Standard,
            FalEndpoint = endpoint,
            FalRequestId = falRequestId,
            Status = JobStatus.Queued,
            CreditsReserved = credits,
            FalInput = JsonDocument.Parse(JsonSerializer.Serialize(input)),
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);
        return new GenerationResponse(jobId, credits, 10);
    }
}
