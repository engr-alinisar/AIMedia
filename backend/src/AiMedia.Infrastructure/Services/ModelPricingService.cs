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

    public async Task<int> GetCreditsAsync(string modelId, int durationSeconds = 1, CancellationToken ct = default)
    {
        var pricing = await GetPricingAsync(modelId, ct);
        return pricing.CreditsPerSecond > 0
            ? pricing.CreditsPerSecond * durationSeconds
            : pricing.CreditsBase;
    }

    public async Task<int> GetVideoCreditsAsync(string modelId, int durationSeconds, bool generateAudio, CancellationToken ct = default)
    {
        // Kling v3 Pro — tiered by audio (1.5× fal.ai cost)
        // fal.ai: $0.112/s (no audio), $0.168/s (audio)
        if (modelId.Contains("kling-video/v3/"))
        {
            var crPerSec = generateAudio ? 25 : 17;
            return crPerSec * durationSeconds;
        }

        // Kling o3 — tiered by audio (1.5× fal.ai cost)
        // fal.ai: $0.084/s (no audio), $0.112/s (audio)
        if (modelId.Contains("kling-video/o3/"))
        {
            var crPerSec = generateAudio ? 17 : 13;
            return crPerSec * durationSeconds;
        }

        // All other video models: use standard DB pricing
        return await GetCreditsAsync(modelId, durationSeconds, ct);
    }

    public async Task<int> GetImageGenCreditsAsync(string modelId, string? quality, string? imageSize, string? resolution, CancellationToken ct = default)
    {
        var pricing = await GetPricingAsync(modelId, ct);

        // GPT Image: dynamic by quality + size
        if (modelId.Contains("gpt-image"))
        {
            var isLarge = imageSize is "1536x1024" or "1024x1536";
            if (modelId.Contains("1-mini"))
                return (quality ?? "high") switch { "low" => 2, "medium" => 5, _ => isLarge ? 11 : 8 };
            if (modelId.Contains("1.5"))
                return (quality ?? "high") switch { "low" => 2, "medium" => 8, _ => isLarge ? 22 : 15 };
            // gpt-image-1
            return (quality ?? "high") switch { "low" => 3, "medium" => 7, _ => isLarge ? 16 : 12 };
        }

        // Nano Banana 2: resolution tiers (2× fal.ai cost)
        if (modelId == "fal-ai/nano-banana-2")
            return (resolution ?? "1K") switch { "0.5K" => 12, "2K" => 24, "4K" => 32, _ => 16 };

        // Nano Banana Pro: resolution tiers (2× fal.ai cost)
        if (modelId == "fal-ai/nano-banana-pro")
            return resolution == "4K" ? 45 : 22;

        return pricing.CreditsBase;
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
