using AiMedia.Domain.Enums;

namespace AiMedia.Application.Common;

public record ModelInfo(
    string Id,               // fal.ai endpoint
    string Name,             // Display name
    string Description,
    int CreditsBase,         // base credits (for non-duration products)
    int CreditsPerSecond,    // for video products (0 for non-video)
    ProductType Product,
    ModelTier Tier           // kept for DB compat
);

public static class ModelRegistry
{
    private static readonly List<ModelInfo> All = new()
    {
        // Image to Video
        new("fal-ai/kling-video/v3/pro/image-to-video",        "Kling v3 Pro",      "Latest Kling, multi-shot, audio, up to 15s",    0, 18, ProductType.ImageToVideo, ModelTier.Standard),
        new("fal-ai/kling-video/o3/standard/image-to-video",   "Kling o3",          "New architecture, multi-shot, up to 15s",       0, 15, ProductType.ImageToVideo, ModelTier.Standard),
        new("fal-ai/kling-video/v2.6/pro/image-to-video",      "Kling v2.6 Pro",    "Improved realism with native audio",            0, 14, ProductType.ImageToVideo, ModelTier.Standard),
        new("fal-ai/kling-video/v2.5-turbo/pro/image-to-video","Kling v2.5 Turbo",          "Fast generation with strong visual fidelity",   0, 10, ProductType.ImageToVideo, ModelTier.Standard),
        new("fal-ai/minimax/hailuo-02/standard/image-to-video","Hailuo 2.0 Standard",      "Dual-resolution image-to-video with end frame", 0, 9,  ProductType.ImageToVideo, ModelTier.Standard),
        new("fal-ai/minimax/hailuo-2.3/pro/image-to-video",    "Hailuo 2.3 Pro",           "Highest quality MiniMax character consistency",  0, 20, ProductType.ImageToVideo, ModelTier.Premium),
        new("fal-ai/wan/v2.2-a14b/image-to-video",             "WAN 2.2",                  "Fast open-source model, good for simple motion", 0, 5,  ProductType.ImageToVideo, ModelTier.Free),
        new("fal-ai/veo3.1/image-to-video",                    "Veo 3.1",      "Latest Veo with audio and up to 4K",           0, 35, ProductType.ImageToVideo, ModelTier.Premium),
        new("fal-ai/veo3.1/fast/first-last-frame-to-video",   "Veo 3.1 Fast", "First & last frame with audio and 4K",        0, 20, ProductType.ImageToVideo, ModelTier.Premium),
        new("fal-ai/veo3/fast",                                "Veo 3 Fast",   "Speed-optimised Veo 3 with audio",            0, 20, ProductType.ImageToVideo, ModelTier.Premium),
        new("fal-ai/veo3/image-to-video",                      "Veo 3",        "Google's best model, ultra-realistic video",  0, 30, ProductType.ImageToVideo, ModelTier.Premium),

        // Text to Video
        new("fal-ai/kling-video/v3/pro/text-to-video",        "Kling v3 Pro",       "Cinematic multi-shot text-to-video with audio",        0, 18, ProductType.TextToVideo, ModelTier.Standard),
        new("fal-ai/kling-video/o3/pro/text-to-video",         "Kling o3 Pro",       "New o3 architecture — multi-shot, up to 15s",          0, 15, ProductType.TextToVideo, ModelTier.Standard),
        new("fal-ai/kling-video/v2.6/pro/text-to-video",       "Kling v2.6 Pro",     "Improved realism with native audio generation",        0, 14, ProductType.TextToVideo, ModelTier.Standard),
        new("fal-ai/kling-video/v2.5-turbo/pro/text-to-video", "Kling v2.5 Turbo",   "Fast generation with strong visual fidelity",          0, 10, ProductType.TextToVideo, ModelTier.Standard),
        new("fal-ai/minimax/hailuo-2.3/pro/text-to-video",     "Hailuo 2.3 Pro",     "Highest quality MiniMax with optimized prompts",       120, 0, ProductType.TextToVideo, ModelTier.Premium),
        new("fal-ai/minimax/hailuo-02/standard/text-to-video", "Hailuo 2.0 Standard","MiniMax with duration control up to 10s",             0,  9, ProductType.TextToVideo, ModelTier.Standard),
        new("fal-ai/veo3",                                     "Veo 3",              "Google Veo 3 — cinematic realism with audio",          0, 30, ProductType.TextToVideo, ModelTier.Premium),
        new("fal-ai/veo3.1",                                   "Veo 3.1",            "Latest Veo — 4K resolution and audio",                 0, 35, ProductType.TextToVideo, ModelTier.Premium),
        new("fal-ai/veo3.1/fast",                              "Veo 3.1 Fast",       "Fast Veo 3.1 — 4K and audio at lower cost",           0, 20, ProductType.TextToVideo, ModelTier.Premium),
        new("fal-ai/wan/v2.2-a14b/text-to-video",              "WAN 2.2",            "Fast open-source text-to-video",                       0,  5, ProductType.TextToVideo, ModelTier.Free),

        // Image Generation
        new("fal-ai/flux/dev",                            "FLUX Dev",        "Open-source FLUX, fast and free",                      5,  0, ProductType.ImageGen, ModelTier.Free),
        new("fal-ai/flux-pro/v1.1",                       "FLUX Pro 1.1",    "Professional image generation, photorealistic",        8,  0, ProductType.ImageGen, ModelTier.Standard),
        new("fal-ai/flux-pro/v1.1-ultra",                 "FLUX Pro Ultra",  "Highest quality, 4MP images with fine details",        11, 0, ProductType.ImageGen, ModelTier.Premium),

        // Background Removal
        new("fal-ai/birefnet",                            "BiRefNet",        "High accuracy background removal",                     3,  0, ProductType.BackgroundRemoval, ModelTier.Free),
        new("fal-ai/pixelcut/remove-background",          "Pixelcut",        "Fast background removal optimized for products",       3,  0, ProductType.BackgroundRemoval, ModelTier.Standard),

        // Voice
        new("fal-ai/kokoro",                              "Kokoro",          "Lightweight TTS, natural voice quality",               4,  0, ProductType.Voice, ModelTier.Free),
        new("fal-ai/minimax/speech-02-hd",                "MiniMax HD",      "High definition voice synthesis",                     18, 0, ProductType.Voice, ModelTier.Standard),
        new("fal-ai/f5-tts",                              "F5-TTS",          "Clone any voice from a 15–30s audio sample",          12, 0, ProductType.Voice, ModelTier.Premium),

        // Transcription
        new("fal-ai/whisper",                             "Whisper",         "OpenAI Whisper, accurate and free",                    10, 0, ProductType.Transcription, ModelTier.Free),
        new("fal-ai/elevenlabs/speech-to-text",           "ElevenLabs STT",  "Premium transcription with speaker diarization",       18, 0, ProductType.Transcription, ModelTier.Premium),
    };

    public static IReadOnlyList<ModelInfo> ForProduct(ProductType product) =>
        All.Where(m => m.Product == product).ToList();

    public static ModelInfo? Get(string modelId) =>
        All.FirstOrDefault(m => m.Id == modelId);

    public static int CalculateCredits(string modelId, int durationSeconds = 1)
    {
        var model = Get(modelId) ?? throw new InvalidOperationException($"Unknown model: {modelId}");
        return model.CreditsPerSecond > 0
            ? model.CreditsPerSecond * durationSeconds
            : model.CreditsBase;
    }
}
