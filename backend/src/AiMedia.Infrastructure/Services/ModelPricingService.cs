using AiMedia.Application.Common;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace AiMedia.Infrastructure.Services;

public class ModelPricingService(
    IAppDbContext db,
    IMemoryCache cache,
    ILogger<ModelPricingService> logger) : IModelPricingService
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(1);
    private const string CacheKeyPrefix = "model_pricing:";
    private static readonly IReadOnlyDictionary<string, (int Width, int Height)> ImageSizeDimensions =
        new Dictionary<string, (int Width, int Height)>(StringComparer.OrdinalIgnoreCase)
        {
            ["square_hd"] = (1024, 1024),
            ["square"] = (512, 512),
            ["portrait_4_3"] = (768, 1024),
            ["portrait_16_9"] = (576, 1024),
            ["landscape_4_3"] = (1024, 768),
            ["landscape_16_9"] = (1024, 576)
        };

    public async Task<int> GetCreditsAsync(string modelId, int durationSeconds = 1, CancellationToken ct = default)
    {
        var pricing = await GetPricingAsync(modelId, ct);
        return pricing.CreditsPerSecond > 0
            ? pricing.CreditsPerSecond * durationSeconds
            : pricing.CreditsBase;
    }

    public async Task<int> GetVideoCreditsAsync(string modelId, int durationSeconds, bool generateAudio, string? resolution = null, CancellationToken ct = default)
    {
        // Kling v3 Pro — tiered by audio (1.5× fal.ai cost)
        // fal.ai: $0.112/s (no audio), $0.168/s (audio)
        if (modelId.Contains("kling-video/v3/"))
        {
            var crPerSec = generateAudio ? 25 : 17;
            return crPerSec * durationSeconds;
        }

        // Kling o3 — tiered by audio (1.5× fal.ai cost)
        // fal.ai: $0.112/s (no audio), $0.14/s (audio)
        if (modelId.Contains("kling-video/o3/"))
        {
            var crPerSec = generateAudio ? 21 : 17;
            return crPerSec * durationSeconds;
        }

        // Kling v2.6 — tiered by audio (1.5× fal.ai cost)
        // fal.ai: $0.07/s (no audio), $0.14/s (audio)
        if (modelId.Contains("kling-video/v2.6/"))
        {
            var crPerSec = generateAudio ? 21 : 11;
            return crPerSec * durationSeconds;
        }

        // Veo 3.1 Fast (first-last-frame) — tiered by resolution + audio (1.5× fal.ai cost)
        // fal.ai: 720p/1080p $0.10(no audio)/$0.15(audio), 4k $0.30/$0.35
        if (modelId.Contains("veo3.1") && modelId.Contains("fast"))
        {
            var is4k = resolution == "4k";
            var crPerSec = (is4k, generateAudio) switch
            {
                (false, false) => 15,   // 720p/1080p no audio
                (false, true)  => 23,   // 720p/1080p audio
                (true,  false) => 45,   // 4k no audio
                (true,  true)  => 53,   // 4k audio
            };
            return crPerSec * durationSeconds;
        }

        // Veo 3.1 (standard image-to-video) — tiered by resolution + audio (1.5× fal.ai cost)
        // fal.ai: 720p/1080p $0.20(no audio)/$0.40(audio), 4k $0.40/$0.60
        if (modelId.Contains("veo3.1"))
        {
            var is4k = resolution == "4k";
            var crPerSec = (is4k, generateAudio) switch
            {
                (false, false) => 30,   // 720p/1080p no audio
                (false, true)  => 60,   // 720p/1080p audio
                (true,  false) => 60,   // 4k no audio
                (true,  true)  => 90,   // 4k audio
            };
            return crPerSec * durationSeconds;
        }

        // Veo 3 Fast — tiered by audio (1.5× fal.ai cost)
        // fal.ai: $0.10/s (no audio), $0.15/s (audio)
        if (modelId.Contains("veo3/fast"))
        {
            var crPerSec = generateAudio ? 23 : 15;
            return crPerSec * durationSeconds;
        }

        // Veo 3 — tiered by audio (1.5× fal.ai cost)
        // fal.ai: $0.20/s (no audio), $0.40/s (audio)
        if (modelId.Contains("veo3") && !modelId.Contains("veo3.1") && !modelId.Contains("fast"))
        {
            var crPerSec = generateAudio ? 60 : 30;
            return crPerSec * durationSeconds;
        }

        // Hailuo 2.0 — tiered by resolution (1.5× fal.ai cost)
        // fal.ai: $0.045/s (768P), $0.017/s (512P)
        if (modelId.Contains("hailuo-02"))
        {
            var crPerSec = resolution == "512P" ? 3 : 7;
            return crPerSec * durationSeconds;
        }

        // All other video models: use standard DB pricing
        return await GetCreditsAsync(modelId, durationSeconds, ct);
    }

    public async Task<int> GetTranscriptionCreditsAsync(string modelId, int durationSeconds, CancellationToken ct = default)
    {
        if (durationSeconds <= 0)
            return await GetCreditsAsync(modelId, 1, ct);

        decimal credits = modelId switch
        {
            "fal-ai/whisper" => (durationSeconds / 60.0m) * 2.502m,
            "fal-ai/wizper" => (durationSeconds / 60.0m) * 9.99m,
            "fal-ai/elevenlabs/speech-to-text" => (durationSeconds / 60.0m) * 4.5m,
            "fal-ai/elevenlabs/speech-to-text/scribe-v2" => (durationSeconds / 60.0m) * 1.2m,
            _ => 0m
        };

        if (credits > 0)
            return Math.Max(1, (int)Math.Round(credits, MidpointRounding.AwayFromZero));

        return await GetCreditsAsync(modelId, 1, ct);
    }

    public async Task<int> GetVoiceCreditsAsync(string modelId, int characterCount, CancellationToken ct = default)
    {
        var safeCharacterCount = Math.Max(1, characterCount);
        var units = (int)Math.Ceiling(safeCharacterCount / 1000.0m);
        var creditsPerThousand = await GetCreditsAsync(modelId, 1, ct);
        return creditsPerThousand * units;
    }

    public async Task<int> GetImageGenCreditsAsync(string modelId, string? quality, string? imageSize, string? resolution, string? thinkingLevel = null, string? renderingSpeed = null, CancellationToken ct = default)
    {
        var pricing = await GetPricingAsync(modelId, ct);

        // FLUX Schnell: flat app pricing.
        if (modelId == "fal-ai/flux/schnell")
            return 10;

        if (modelId == "fal-ai/flux-pro/v1.1")
            return 10;

        // FLUX 2 Pro: $0.03 first billed MP + $0.015 each additional billed MP at 1.5× markup, minimum 10 credits.
        if (modelId == "fal-ai/flux-2-pro")
        {
            var billedMegapixels = GetBilledMegapixels(imageSize);
            var credits = 4.5m + Math.Max(0, billedMegapixels - 1) * 2.25m;
            return Math.Max(10, (int)Math.Round(credits, MidpointRounding.AwayFromZero));
        }

        if (modelId == "fal-ai/imagen3/fast")
            return 10;

        if (modelId == "fal-ai/imagen4/preview")
            return 10;

        if (modelId == "fal-ai/bytedance/seedream/v4/text-to-image")
            return 10;

        if (modelId == "fal-ai/bytedance/seedream/v5/lite/text-to-image")
            return 10;

        if (modelId == "fal-ai/ideogram/v2")
            return 12;

        if (modelId == "fal-ai/ideogram/v3")
        {
            decimal credits = (renderingSpeed ?? "BALANCED").ToUpperInvariant() switch
            {
                "TURBO" => 4.5m,
                "QUALITY" => 13.5m,
                _ => 9m
            };
            return Math.Max(10, (int)Math.Round(credits, MidpointRounding.AwayFromZero));
        }

        // Nano Banana: flat app pricing with minimum floor.
        if (modelId == "fal-ai/nano-banana")
            return 10;

        // Nano Banana 2: resolution tiers from provider pricing with 1.5× app markup.
        if (modelId == "fal-ai/nano-banana-2")
        {
            decimal baseCredits = (resolution ?? "1K") switch
            {
                "0.5K" => 9m,
                "2K" => 18m,
                "4K" => 24m,
                _ => 12m
            };
            if (string.Equals(thinkingLevel, "high", StringComparison.OrdinalIgnoreCase))
                baseCredits += 0.3m;
            return Math.Max(10, (int)Math.Round(baseCredits, MidpointRounding.AwayFromZero));
        }

        // Nano Banana Pro: resolution tiers from provider pricing with 1.5× app markup.
        if (modelId == "fal-ai/nano-banana-pro")
            return resolution == "4K" ? 45 : 23;

        return pricing.CreditsBase;
    }

    private static int GetBilledMegapixels(string? imageSize)
    {
        var sizeKey = string.IsNullOrWhiteSpace(imageSize) ? "square_hd" : imageSize;
        if (!ImageSizeDimensions.TryGetValue(sizeKey, out var dims))
            dims = ImageSizeDimensions["square_hd"];

        var megapixels = (dims.Width * dims.Height) / 1_000_000m;
        return Math.Max(1, (int)Math.Ceiling(megapixels));
    }

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var existingMap = await db.ModelPricings
            .ToDictionaryAsync(p => p.ModelId, ct);

        var inserted = 0;
        var updated = 0;

        foreach (var m in ModelRegistry.AllModels)
        {
            if (existingMap.TryGetValue(m.Id, out var existing))
            {
                // Update if pricing changed in code
                if (existing.CreditsBase != m.CreditsBase || existing.CreditsPerSecond != m.CreditsPerSecond)
                {
                    existing.CreditsBase = m.CreditsBase;
                    existing.CreditsPerSecond = m.CreditsPerSecond;
                    existing.UpdatedAt = DateTime.UtcNow;
                    updated++;
                }
            }
            else
            {
                db.ModelPricings.Add(new ModelPricing
                {
                    ModelId = m.Id,
                    CreditsBase = m.CreditsBase,
                    CreditsPerSecond = m.CreditsPerSecond,
                    UpdatedAt = DateTime.UtcNow
                });
                inserted++;
            }
        }

        if (inserted > 0 || updated > 0)
        {
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Seeded pricing: {Inserted} new, {Updated} updated", inserted, updated);
        }
    }

    private async Task<ModelPricing> GetPricingAsync(string modelId, CancellationToken ct)
    {
        var cacheKey = CacheKeyPrefix + modelId;
        if (cache.TryGetValue(cacheKey, out ModelPricing? cached) && cached is not null)
            return cached;

        var pricing = await db.ModelPricings.AsNoTracking()
            .FirstOrDefaultAsync(p => p.ModelId == modelId, ct);

        if (pricing is null)
        {
            // Fallback to ModelRegistry seed values (model may not be seeded yet)
            var info = ModelRegistry.Get(modelId)
                ?? throw new InvalidOperationException($"Unknown model: {modelId}");
            pricing = new ModelPricing
            {
                ModelId = modelId,
                CreditsBase = info.CreditsBase,
                CreditsPerSecond = info.CreditsPerSecond
            };
            logger.LogWarning("Model {ModelId} not found in model_pricings table, using registry fallback", modelId);
        }

        cache.Set(cacheKey, pricing, CacheTtl);
        return pricing;
    }
}
