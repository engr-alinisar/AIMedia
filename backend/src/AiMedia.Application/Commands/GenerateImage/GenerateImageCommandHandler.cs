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

        var credits = ModelRegistry.CalculateCredits(request.ModelId);

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();
        var input = new
        {
            prompt = request.Prompt,
            image_size = request.ImageSize,
            negative_prompt = request.NegativePrompt
        };

        // Reserve credits before submission
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
            CreatedAt = DateTime.UtcNow
        };

        db.GenerationJobs.Add(job);
        await db.SaveChangesAsync(cancellationToken);

        return new GenerationResponse(jobId, credits, 15);
    }
}
