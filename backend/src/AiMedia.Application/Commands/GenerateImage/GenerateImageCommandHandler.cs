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
        var credits = CreditCalculator.Calculate(ProductType.ImageGen, request.Tier);

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();
        var input = new
        {
            prompt = request.Prompt,
            image_size = $"{request.Width}x{request.Height}",
            negative_prompt = request.NegativePrompt,
            tier = request.Tier.ToString().ToLower()
        };

        // Reserve credits before submission
        await creditService.ReserveAsync(request.UserId, jobId, credits, $"Image generation ({request.Tier})", cancellationToken);

        string falRequestId;
        try
        {
            falRequestId = await falClient.SubmitJobAsync(
                GetEndpoint(request.Tier),
                input,
                $"WEBHOOK_PLACEHOLDER/{jobId}",
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
            Tier = request.Tier,
            FalEndpoint = GetEndpoint(request.Tier),
            FalRequestId = falRequestId,
            Status = JobStatus.Queued,
            CreditsReserved = credits,
            FalInput = JsonDocument.Parse(JsonSerializer.Serialize(input)),
            CreatedAt = DateTime.UtcNow
        };

        db.GenerationJobs.Add(job);
        await db.SaveChangesAsync(cancellationToken);

        return new GenerationResponse(jobId, credits, 15);
    }

    private static string GetEndpoint(ModelTier tier) => tier switch
    {
        ModelTier.Free     => "fal-ai/flux/dev",
        ModelTier.Standard => "fal-ai/flux-pro/v1.1",
        ModelTier.Premium  => "fal-ai/flux-pro/v2",
        _ => "fal-ai/flux/dev"
    };
}
