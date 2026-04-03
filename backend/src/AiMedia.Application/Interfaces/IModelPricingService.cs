using AiMedia.Application.DTOs;
using AiMedia.Domain.Enums;

namespace AiMedia.Application.Interfaces;

public interface IModelPricingService
{
    /// <summary>Credits for flat-rate and per-second models.</summary>
    Task<int> GetCreditsAsync(string modelId, int durationSeconds = 1, CancellationToken ct = default);

    /// <summary>Credits for video models with audio/resolution tier pricing.</summary>
    Task<int> GetVideoCreditsAsync(string modelId, int durationSeconds, bool generateAudio, string? resolution = null, CancellationToken ct = default);

    /// <summary>Credits for motion-control video models that charge by reference video duration.</summary>
    Task<int> GetMotionControlCreditsAsync(string modelId, int durationSeconds, CancellationToken ct = default);

    /// <summary>Credits for transcription models that charge by audio duration.</summary>
    Task<int> GetTranscriptionCreditsAsync(string modelId, int durationSeconds, CancellationToken ct = default);

    /// <summary>Credits for voice models that charge by text length buckets (for example per 1,000 characters).</summary>
    Task<int> GetVoiceCreditsAsync(string modelId, int characterCount, CancellationToken ct = default);

    /// <summary>Credits for image generation — handles model-specific dynamic pricing like Nano Banana and Ideogram tiers.</summary>
    Task<int> GetImageGenCreditsAsync(string modelId, string? quality, string? imageSize, string? resolution, string? thinkingLevel = null, string? renderingSpeed = null, CancellationToken ct = default);

    Task<int> GetImageStudioCreditsAsync(string modelId, string? renderingSpeed = null, CancellationToken ct = default);

    /// <summary>Frontend-ready model catalog with display pricing from the backend source of truth.</summary>
    Task<IReadOnlyList<ModelCatalogItemDto>> GetCatalogAsync(ProductType? product = null, CancellationToken ct = default);
}
