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
        new("fal-ai/wan/v2.2-a14b/image-to-video",       "WAN 2.2",         "Fast open-source model, good for simple motion",       0, 5,  ProductType.ImageToVideo, ModelTier.Free),
        new("fal-ai/kling-video/v3/pro/image-to-video",   "Kling v3 Pro",    "High quality motion, cinematic results",               0, 18, ProductType.ImageToVideo, ModelTier.Standard),
        new("fal-ai/veo3/image-to-video",                 "Veo 3",           "Google's best model, ultra-realistic video",           0, 30, ProductType.ImageToVideo, ModelTier.Premium),

        // Text to Video
        new("fal-ai/wan/v2.2-a14b/text-to-video",         "WAN 2.2",         "Fast text-to-video, great for quick previews",         0, 5,  ProductType.TextToVideo, ModelTier.Free),
        new("fal-ai/kling-video/v3/pro/text-to-video",    "Kling v3 Pro",    "Cinematic text-to-video with high prompt adherence",   0, 18, ProductType.TextToVideo, ModelTier.Standard),
        new("fal-ai/veo3",                                "Veo 3",           "Google's Veo 3, highest quality text-to-video",        0, 30, ProductType.TextToVideo, ModelTier.Premium),

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
