using AiMedia.Application.Common;
using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Enums;

namespace AiMedia.Infrastructure.Services;

public class ModelPricingService : IModelPricingService
{
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

    public Task<int> GetCreditsAsync(string modelId, int durationSeconds = 1, CancellationToken ct = default)
    {
        var model = ModelRegistry.Get(modelId)
            ?? throw new InvalidOperationException($"Unknown model: {modelId}");
        return Task.FromResult(model.CreditsPerSecond > 0
            ? model.CreditsPerSecond * durationSeconds
            : model.CreditsBase);
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

    public Task<int> GetImageGenCreditsAsync(string modelId, string? quality, string? imageSize, string? resolution, string? thinkingLevel = null, string? renderingSpeed = null, CancellationToken ct = default)
    {
        

        // FLUX Schnell: flat app pricing.
        if (modelId == "fal-ai/flux/schnell")
            return Task.FromResult(10);

        if (modelId == "fal-ai/flux-pro/v1.1")
            return Task.FromResult(10);

        // FLUX 2 Pro: $0.03 first billed MP + $0.015 each additional billed MP at 1.5× markup, minimum 10 credits.
        if (modelId == "fal-ai/flux-2-pro")
        {
            var billedMegapixels = GetBilledMegapixels(imageSize);
            var credits = 4.5m + Math.Max(0, billedMegapixels - 1) * 2.25m;
            return Task.FromResult(Math.Max(10, (int)Math.Round(credits, MidpointRounding.AwayFromZero)));
        }

        if (modelId == "fal-ai/imagen3/fast")
            return Task.FromResult(10);

        if (modelId == "fal-ai/imagen4/preview")
            return Task.FromResult(10);

        if (modelId == "fal-ai/bytedance/seedream/v4/text-to-image")
            return Task.FromResult(10);

        if (modelId == "fal-ai/bytedance/seedream/v5/lite/text-to-image")
            return Task.FromResult(10);

        if (modelId == "fal-ai/ideogram/v2")
            return Task.FromResult(12);

        if (modelId == "fal-ai/ideogram/v3")
        {
            decimal credits = (renderingSpeed ?? "BALANCED").ToUpperInvariant() switch
            {
                "TURBO" => 4.5m,
                "QUALITY" => 13.5m,
                _ => 9m
            };
            return Task.FromResult(Math.Max(10, (int)Math.Round(credits, MidpointRounding.AwayFromZero)));
        }

        // Nano Banana: flat app pricing with minimum floor.
        if (modelId == "fal-ai/nano-banana")
            return Task.FromResult(10);

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
            return Task.FromResult(Math.Max(10, (int)Math.Round(baseCredits, MidpointRounding.AwayFromZero)));
        }

        // Nano Banana Pro: resolution tiers from provider pricing with 1.5× app markup.
        if (modelId == "fal-ai/nano-banana-pro")
            return Task.FromResult(resolution == "4K" ? 45 : 23);

        var model = ModelRegistry.Get(modelId)
            ?? throw new InvalidOperationException($"Unknown model: {modelId}");
        return Task.FromResult(model.CreditsBase);
    }

    public Task<int> GetImageStudioCreditsAsync(string modelId, string? renderingSpeed = null, CancellationToken ct = default)
    {
        if (modelId == "fal-ai/ideogram/v3/edit")
        {
            var credits = (renderingSpeed ?? "BALANCED").ToUpperInvariant() switch
            {
                "TURBO" => 6,
                "QUALITY" => 18,
                _ => 12
            };
            return Task.FromResult(credits);
        }

        return GetCreditsAsync(modelId, 1, ct);
    }

    public async Task<IReadOnlyList<ModelCatalogItemDto>> GetCatalogAsync(ProductType? product = null, CancellationToken ct = default)
    {
        var models = (product.HasValue ? ModelRegistry.ForProduct(product.Value) : ModelRegistry.AllModels).ToList();
        var items = new List<ModelCatalogItemDto>(models.Count);

        foreach (var model in models)
        {
            items.Add(new ModelCatalogItemDto(
                model.Id,
                model.Name,
                model.Description,
                model.Product.ToString(),
                model.Tier.ToString(),
                model.CreditsBase,
                model.CreditsPerSecond,
                await GetDisplayPriceAsync(model, ct)));
        }

        return items;
    }

    private static int GetBilledMegapixels(string? imageSize)
    {
        var sizeKey = string.IsNullOrWhiteSpace(imageSize) ? "square_hd" : imageSize;
        if (!ImageSizeDimensions.TryGetValue(sizeKey, out var dims))
            dims = ImageSizeDimensions["square_hd"];

        var megapixels = (dims.Width * dims.Height) / 1_000_000m;
        return Math.Max(1, (int)Math.Ceiling(megapixels));
    }

    private async Task<string> GetDisplayPriceAsync(ModelInfo model, CancellationToken ct)
    {
        return model.Product switch
        {
            ProductType.Voice => $"{await GetVoiceCreditsAsync(model.Id, 1, ct)} cr/1K chars",
            ProductType.Transcription => $"{await GetTranscriptionCreditsAsync(model.Id, 60, ct)} cr/min",
            ProductType.ImageGen => $"{await GetImageGenCreditsAsync(model.Id, null, null, null, null, null, ct)} credits",
            ProductType.BackgroundRemoval => $"{await GetCreditsAsync(model.Id, 1, ct)} credits",
            ProductType.TextToVideo or ProductType.ImageToVideo => GetVideoDisplayPrice(model.Id),
            _ => $"{await GetCreditsAsync(model.Id, 1, ct)} credits"
        };
    }

    private static string GetVideoDisplayPrice(string modelId)
    {
        return modelId switch
        {
            "fal-ai/kling-video/v3/pro/text-to-video" => "17-25 cr/s",
            "fal-ai/kling-video/o3/pro/text-to-video" => "17-21 cr/s",
            "fal-ai/kling-video/v2.6/pro/text-to-video" => "11-21 cr/s",
            "fal-ai/kling-video/v2.5-turbo/pro/text-to-video" => "11 cr/s",
            "fal-ai/minimax/hailuo-2.3/pro/text-to-video" => "74 credits",
            "fal-ai/minimax/hailuo-02/standard/text-to-video" => "7 cr/s",
            "fal-ai/veo3.1" => "30-90 cr/s",
            "fal-ai/veo3.1/fast" => "15-53 cr/s",
            "fal-ai/veo3" => "30-60 cr/s",
            "fal-ai/veo3/fast" => "15-23 cr/s",

            "fal-ai/kling-video/v3/pro/image-to-video" => "17-25 cr/s",
            "fal-ai/kling-video/o3/standard/image-to-video" => "13-17 cr/s",
            "fal-ai/kling-video/v2.6/pro/image-to-video" => "14 cr/s",
            "fal-ai/kling-video/v2.5-turbo/pro/image-to-video" => "11 cr/s",
            "fal-ai/minimax/hailuo-2.3/pro/image-to-video" => "74 credits",
            "fal-ai/minimax/hailuo-02/standard/image-to-video" => "3-7 cr/s",
            "fal-ai/veo3.1/image-to-video" => "30-90 cr/s",
            "fal-ai/veo3.1/fast/first-last-frame-to-video" => "15-53 cr/s",
            "fal-ai/veo3/image-to-video" => "30-60 cr/s",
            _ => "Custom pricing"
        };
    }

}
