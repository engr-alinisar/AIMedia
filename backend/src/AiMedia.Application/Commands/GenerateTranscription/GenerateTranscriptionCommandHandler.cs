using System.Text.Json;
using AiMedia.Application.Common;
using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using AiMedia.Domain.Enums;
using MediatR;

namespace AiMedia.Application.Commands.GenerateTranscription;

public class GenerateTranscriptionCommandHandler(
    IAppDbContext db,
    IFalClient falClient,
    ICreditService creditService,
    IStorageService storage,
    IModelPricingService pricing) : IRequestHandler<GenerateTranscriptionCommand, GenerationResponse>
{
    public async Task<GenerationResponse> Handle(GenerateTranscriptionCommand request, CancellationToken cancellationToken)
    {
        var model = ModelRegistry.Get(request.ModelId)
            ?? throw new InvalidOperationException($"Unknown model: {request.ModelId}");

        var credits = await pricing.GetTranscriptionCreditsAsync(request.ModelId, request.DurationSeconds ?? 0, cancellationToken);

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();
        string audioUrl = request.AudioUrl ?? string.Empty;

        // Upload file to R2 if stream provided
        // Use public URL (not presigned) — fal.ai cannot fetch presigned R2 URLs
        if (request.AudioStream != null && request.FileName != null)
        {
            var key = storage.BuildKey(request.UserId, jobId, request.FileName);
            await storage.UploadAsync(request.AudioStream, key, "audio/mpeg", cancellationToken);
            audioUrl = storage.GetPublicUrl(key);
        }

        object input;
        var isWhisper    = request.ModelId is "fal-ai/whisper";
        var isWizper     = request.ModelId is "fal-ai/wizper";
        var isElevenLabs = request.ModelId.StartsWith("fal-ai/elevenlabs/speech-to-text");

        if (isWhisper)
        {
            input = new
            {
                audio_url   = audioUrl,
                task        = request.Task ?? "transcribe",
                language    = request.Language,
                diarize     = request.Diarize ?? false,
                chunk_level = "segment",
            };
        }
        else if (isWizper)
        {
            input = new
            {
                audio_url   = audioUrl,
                task        = request.Task ?? "transcribe",
                language    = request.Language ?? "en",
                chunk_level = "segment",
            };
        }
        else if (isElevenLabs)
        {
            input = new
            {
                audio_url          = audioUrl,
                language_code      = request.Language,
                diarize            = request.Diarize ?? true,
                tag_audio_events   = request.TagAudioEvents ?? true,
            };
        }
        else
        {
            input = new { audio_url = audioUrl };
        }

        await creditService.ReserveAsync(request.UserId, jobId, credits, $"Transcription ({model.Name})", cancellationToken);

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
            Product = ProductType.Transcription,
            Tier = model.Tier,
            FalEndpoint = request.ModelId,
            FalRequestId = falSubmit.RequestId,
            FalStatusUrl = falSubmit.StatusUrl,
            FalResponseUrl = falSubmit.ResponseUrl,
            Status = JobStatus.Queued,
            CreditsReserved = credits,
            DurationSeconds = request.DurationSeconds ?? 0,
            FalInput = JsonDocument.Parse(JsonSerializer.Serialize(input)),
            IsPublic = request.IsPublic,
            Zone = request.Zone,
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);
        return new GenerationResponse(jobId, credits, 30);
    }
}
