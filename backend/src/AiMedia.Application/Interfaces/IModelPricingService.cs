namespace AiMedia.Application.Interfaces;

public interface IModelPricingService
{
    /// <summary>Credits for flat-rate and per-second models.</summary>
    Task<int> GetCreditsAsync(string modelId, int durationSeconds = 1, CancellationToken ct = default);

    /// <summary>Credits for video models with audio tier pricing (audio off / audio on).</summary>
    Task<int> GetVideoCreditsAsync(string modelId, int durationSeconds, bool generateAudio, CancellationToken ct = default);

    /// <summary>Credits for image generation — handles GPT Image quality tiers and Nano Banana resolution tiers.</summary>
    Task<int> GetImageGenCreditsAsync(string modelId, string? quality, string? imageSize, string? resolution, CancellationToken ct = default);

    /// <summary>Seed pricing rows from ModelRegistry for any model not yet in the DB.</summary>
    Task SeedAsync(CancellationToken ct = default);
}
