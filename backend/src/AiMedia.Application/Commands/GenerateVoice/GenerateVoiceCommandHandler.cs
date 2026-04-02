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
    ICreditService creditService,
    IModelPricingService pricing) : IRequestHandler<GenerateVoiceCommand, GenerationResponse>
{
    public async Task<GenerationResponse> Handle(GenerateVoiceCommand request, CancellationToken cancellationToken)
    {
        var model = ModelRegistry.Get(request.ModelId)
            ?? throw new InvalidOperationException($"Unknown model: {request.ModelId}");

        var credits = await pricing.GetVoiceCreditsAsync(request.ModelId, request.Text.Length, cancellationToken);

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();

        var isKokoro        = request.ModelId.StartsWith("fal-ai/kokoro");
        var isElevenLabs    = request.ModelId.StartsWith("fal-ai/elevenlabs/tts");
        var isElevenV3      = request.ModelId == "fal-ai/elevenlabs/tts/eleven-v3";
        var isMiniMaxSpeech = request.ModelId.Contains("minimax/speech") || request.ModelId.Contains("minimax/preview/speech");

        object input;
        if (request.ModelId == "fal-ai/f5-tts")
        {
            string? refAudioUrl = request.RefAudioUrl;
            string refText = "";

            if (request.VoiceCloneId.HasValue)
            {
                var clone = await db.VoiceClones.FirstOrDefaultAsync(
                    v => v.Id == request.VoiceCloneId && v.UserId == request.UserId,
                    cancellationToken) ?? throw new InvalidOperationException("Voice clone not found.");

                refAudioUrl = clone.FalVoiceId;
                refText = clone.ReferenceText;
                clone.LastUsedAt = DateTime.UtcNow;
            }

            if (string.IsNullOrEmpty(refAudioUrl))
                throw new InvalidOperationException("A reference audio URL is required for F5-TTS voice cloning.");

            input = new
            {
                gen_text      = request.Text,
                ref_audio_url = refAudioUrl,
                ref_text      = refText,
                model_type    = "F5-TTS"
            };
        }
        else if (isKokoro)
        {
            input = new
            {
                prompt = request.Text,
                voice  = request.VoiceId ?? "af_heart",
                speed  = request.Speed ?? 1.0f
            };
        }
        else if (isElevenLabs)
        {
            input = isElevenV3
                ? new
                {
                    text          = request.Text,
                    voice         = request.VoiceId ?? "Rachel",
                    stability     = request.Stability ?? 0.5f,
                    speed         = request.Speed ?? 1.0f,
                    language_code = request.LanguageCode
                }
                : new
                {
                    text             = request.Text,
                    voice            = request.VoiceId ?? "Rachel",
                    stability        = request.Stability ?? 0.5f,
                    similarity_boost = request.SimilarityBoost ?? 0.75f,
                    style            = request.VoiceStyle ?? 0f,
                    speed            = request.Speed ?? 1.0f,
                    language_code    = request.LanguageCode
                };
        }
        else if (isMiniMaxSpeech)
        {
            input = new
            {
                prompt         = request.Text,
                voice_id       = request.VoiceId ?? "Wise_Woman",
                speed          = request.Speed ?? 1.0f,
                vol            = request.Vol ?? 1.0f,
                pitch          = request.Pitch ?? 0,
                emotion        = request.Emotion,
                language_boost = "auto"
            };
        }
        else
        {
            // fallback
            input = new { text = request.Text, voice = request.VoiceId };
        }

        await creditService.ReserveAsync(request.UserId, jobId, credits, $"Voice TTS ({model.Name})", cancellationToken);

        FalSubmitResult falSubmit;
        try
        {
            falSubmit = await falClient.SubmitJobAsync(request.ModelId, input, falClient.BuildWebhookUrl(jobId), cancellationToken);
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
            Zone = request.Zone,
            Title = request.Title,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);
        return new GenerationResponse(jobId, credits, 10);
    }
}
