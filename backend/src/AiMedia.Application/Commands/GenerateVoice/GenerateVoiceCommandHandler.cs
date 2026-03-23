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

        object input;
        if (request.ModelId == "fal-ai/f5-tts")
        {
            string? refAudioUrl = request.RefAudioUrl;
            string refText = "";

            // Saved voice clone takes priority over inline upload
            if (request.VoiceCloneId.HasValue)
            {
                var clone = await db.VoiceClones.FirstOrDefaultAsync(
                    v => v.Id == request.VoiceCloneId && v.UserId == request.UserId,
                    cancellationToken) ?? throw new InvalidOperationException("Voice clone not found.");

                refAudioUrl = clone.FalVoiceId; // R2 public URL stored in FalVoiceId
                refText = clone.ReferenceText;
                clone.LastUsedAt = DateTime.UtcNow;
            }

            if (string.IsNullOrEmpty(refAudioUrl))
                throw new InvalidOperationException("A reference audio URL is required for F5-TTS voice cloning.");

            input = new
            {
                gen_text = request.Text,
                ref_audio_url = refAudioUrl,
                ref_text = refText,
                model_type = "F5-TTS"
            };
        }
        else
        {
            // fal-ai/kokoro uses "voice" field (not "voice_id")
            input = new
            {
                text = request.Text,
                voice = request.VoiceId
            };
        }

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
            IsPublic = request.IsPublic,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);
        return new GenerationResponse(jobId, credits, 10);
    }
}
