using System.Text.Json;
using AiMedia.Application.Common;
using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using AiMedia.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Application.Commands.GenerateVoice;

public class GenerateVoiceCommandHandler(
    IAppDbContext db,
    IFalClient falClient,
    ICreditService creditService) : IRequestHandler<GenerateVoiceCommand, GenerationResponse>
{
    public async Task<GenerationResponse> Handle(GenerateVoiceCommand request, CancellationToken cancellationToken)
    {
        var model = ModelRegistry.Get(request.ModelId)
            ?? throw new InvalidOperationException($"Unknown model: {request.ModelId}");

        // Cost per 1000 characters
        var charCount = Math.Max(1, request.Text.Length);
        var units = (int)Math.Ceiling(charCount / 1000.0);
        var credits = ModelRegistry.CalculateCredits(request.ModelId) * units;

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();

        string? customVoiceId = null;
        if (request.VoiceCloneId.HasValue)
        {
            var clone = await db.VoiceClones.FirstOrDefaultAsync(
                v => v.Id == request.VoiceCloneId && v.UserId == request.UserId,
                cancellationToken) ?? throw new InvalidOperationException("Voice clone not found.");
            customVoiceId = clone.FalVoiceId;
        }

        var input = new
        {
            text = request.Text,
            voice_id = request.VoiceId,
            custom_voice_id = customVoiceId
        };

        await creditService.ReserveAsync(request.UserId, jobId, credits, $"Voice TTS ({model.Name})", cancellationToken);

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
            Product = ProductType.Voice,
            Tier = model.Tier,
            FalEndpoint = request.ModelId,
            FalRequestId = falSubmit.RequestId,
            FalStatusUrl = falSubmit.StatusUrl,
            FalResponseUrl = falSubmit.ResponseUrl,
            Status = JobStatus.Queued,
            CreditsReserved = credits,
            FalInput = JsonDocument.Parse(JsonSerializer.Serialize(input)),
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);
        return new GenerationResponse(jobId, credits, 10);
    }
}
