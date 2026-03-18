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
    IStorageService storage) : IRequestHandler<GenerateTranscriptionCommand, GenerationResponse>
{
    public async Task<GenerationResponse> Handle(GenerateTranscriptionCommand request, CancellationToken cancellationToken)
    {
        var credits = CreditCalculator.Calculate(ProductType.Transcription, request.Tier);

        if (!await creditService.HasSufficientCreditsAsync(request.UserId, credits, cancellationToken))
            throw new InvalidOperationException("Insufficient credits.");

        var jobId = Guid.NewGuid();
        string audioUrl = request.AudioUrl ?? string.Empty;

        // Upload file to R2 if stream provided
        if (request.AudioStream != null && request.FileName != null)
        {
            var key = storage.BuildKey(request.UserId, jobId, request.FileName);
            await storage.UploadAsync(request.AudioStream, key, "audio/mpeg", cancellationToken);
            audioUrl = await storage.GetPresignedUrlAsync(key, TimeSpan.FromHours(1));
        }

        var input = new { audio_url = audioUrl };

        await creditService.ReserveAsync(request.UserId, jobId, credits, $"Transcription ({request.Tier})", cancellationToken);

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
            Product = ProductType.Transcription,
            Tier = request.Tier,
            FalEndpoint = GetEndpoint(request.Tier),
            FalRequestId = falRequestId,
            Status = JobStatus.Queued,
            CreditsReserved = credits,
            FalInput = JsonDocument.Parse(JsonSerializer.Serialize(input)),
            CreatedAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync(cancellationToken);
        return new GenerationResponse(jobId, credits, 30);
    }

    private static string GetEndpoint(ModelTier tier) => tier switch
    {
        ModelTier.Premium => "fal-ai/elevenlabs/speech-to-text",
        _                 => "fal-ai/whisper"
    };
}
