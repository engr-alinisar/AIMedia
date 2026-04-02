using AiMedia.Domain.Enums;

namespace AiMedia.Application.Common;

public record ModelInfo(
    string Id,
    string Name,
    string Description,
    int CreditsBase,
    int CreditsPerSecond,
    ProductType Product,
    ModelTier Tier
);

public static class ModelRegistry
{
    private static readonly List<ModelInfo> All = new()
    {
        new("fal-ai/kling-video/v3/pro/image-to-video", "Kling v3 Pro", "Latest Kling, multi-shot, audio, up to 15s", 0, 17, ProductType.ImageToVideo, ModelTier.Standard),
        new("fal-ai/kling-video/o3/standard/image-to-video", "Kling o3", "New architecture, multi-shot, up to 15s", 0, 13, ProductType.ImageToVideo, ModelTier.Standard),
        new("fal-ai/kling-video/v2.6/pro/image-to-video", "Kling v2.6 Pro", "Improved realism with native audio", 0, 14, ProductType.ImageToVideo, ModelTier.Standard),
        new("fal-ai/kling-video/v2.5-turbo/pro/image-to-video", "Kling v2.5 Turbo", "Fast generation with strong visual fidelity", 0, 11, ProductType.ImageToVideo, ModelTier.Standard),
        new("fal-ai/minimax/hailuo-02/standard/image-to-video", "Hailuo 2.0 Standard", "Dual-resolution image-to-video with end frame", 0, 7, ProductType.ImageToVideo, ModelTier.Standard),
        new("fal-ai/minimax/hailuo-2.3/pro/image-to-video", "Hailuo 2.3 Pro", "Highest quality MiniMax character consistency", 74, 0, ProductType.ImageToVideo, ModelTier.Premium),
        new("fal-ai/veo3.1/image-to-video", "Veo 3.1", "Latest Veo with audio and up to 4K", 0, 30, ProductType.ImageToVideo, ModelTier.Premium),
        new("fal-ai/veo3.1/fast/first-last-frame-to-video", "Veo 3.1 Fast", "First & last frame with audio and 4K", 0, 30, ProductType.ImageToVideo, ModelTier.Premium),
        new("fal-ai/veo3/fast", "Veo 3 Fast", "Speed-optimised Veo 3 with audio", 0, 20, ProductType.ImageToVideo, ModelTier.Premium),
        new("fal-ai/veo3/image-to-video", "Veo 3", "Google's best model, ultra-realistic video", 0, 30, ProductType.ImageToVideo, ModelTier.Premium),

        new("fal-ai/kling-video/v3/pro/text-to-video", "Kling v3 Pro", "Cinematic multi-shot text-to-video with audio", 0, 17, ProductType.TextToVideo, ModelTier.Standard),
        new("fal-ai/kling-video/o3/pro/text-to-video", "Kling o3 Pro", "New o3 architecture, multi-shot, up to 15s", 0, 17, ProductType.TextToVideo, ModelTier.Standard),
        new("fal-ai/kling-video/v2.6/pro/text-to-video", "Kling v2.6 Pro", "Improved realism with native audio generation", 0, 11, ProductType.TextToVideo, ModelTier.Standard),
        new("fal-ai/kling-video/v2.5-turbo/pro/text-to-video", "Kling v2.5 Turbo", "Fast generation with strong visual fidelity", 0, 11, ProductType.TextToVideo, ModelTier.Standard),
        new("fal-ai/minimax/hailuo-2.3/pro/text-to-video", "Hailuo 2.3 Pro", "Highest quality MiniMax with optimized prompts", 74, 0, ProductType.TextToVideo, ModelTier.Premium),
        new("fal-ai/minimax/hailuo-02/standard/text-to-video", "Hailuo 2.0 Standard", "MiniMax with duration control up to 10s", 0, 7, ProductType.TextToVideo, ModelTier.Standard),
        new("fal-ai/veo3", "Veo 3", "Google Veo 3, cinematic realism with audio", 0, 30, ProductType.TextToVideo, ModelTier.Premium),
        new("fal-ai/veo3.1", "Veo 3.1", "Latest Veo, 4K resolution and audio", 0, 30, ProductType.TextToVideo, ModelTier.Premium),
        new("fal-ai/veo3.1/fast", "Veo 3.1 Fast", "Fast Veo 3.1, 4K and audio at lower cost", 0, 20, ProductType.TextToVideo, ModelTier.Premium),

        new("fal-ai/flux/schnell", "FLUX Schnell", "Ultra-fast 1-4 step generation", 2, 0, ProductType.ImageGen, ModelTier.Free),
        new("fal-ai/flux-pro/v1.1", "FLUX Pro 1.1", "High quality with improved photorealism", 8, 0, ProductType.ImageGen, ModelTier.Premium),
        new("fal-ai/flux-2-pro", "FLUX 2 Pro", "Latest FLUX with improved typography", 10, 0, ProductType.ImageGen, ModelTier.Premium),
        new("fal-ai/nano-banana", "Nano Banana", "Google's fast generation model", 6, 0, ProductType.ImageGen, ModelTier.Standard),
        new("fal-ai/nano-banana-2", "Nano Banana 2", "Google gen with web search and up to 4K", 8, 0, ProductType.ImageGen, ModelTier.Premium),
        new("fal-ai/nano-banana-pro", "Nano Banana Pro", "Google's pro model with 4K resolution", 10, 0, ProductType.ImageGen, ModelTier.Premium),
        new("fal-ai/imagen3/fast", "Imagen 3 Fast", "Fast version of Google Imagen 3", 6, 0, ProductType.ImageGen, ModelTier.Standard),
        new("fal-ai/imagen4/preview", "Imagen 4 Preview", "Google Imagen 4 preview with up to 2K", 15, 0, ProductType.ImageGen, ModelTier.Premium),
        new("fal-ai/bytedance/seedream/v4/text-to-image", "Seedream v4", "ByteDance high-quality generation", 6, 0, ProductType.ImageGen, ModelTier.Standard),
        new("fal-ai/bytedance/seedream/v5/lite/text-to-image", "Seedream v5 Lite", "ByteDance v5 with 2K-3K resolution", 8, 0, ProductType.ImageGen, ModelTier.Premium),
        new("fal-ai/ideogram/v2", "Ideogram v2", "Style-rich generation with text rendering", 8, 0, ProductType.ImageGen, ModelTier.Standard),
        new("fal-ai/ideogram/v3", "Ideogram v3", "Latest Ideogram with style presets", 12, 0, ProductType.ImageGen, ModelTier.Premium),

        new("fal-ai/bria/background/remove", "BRIA Remove BG", "Commercial-safe background removal by BRIA", 4, 0, ProductType.BackgroundRemoval, ModelTier.Standard),
        new("fal-ai/bria/background/replace", "BRIA Replace BG", "Swap background with text prompt or reference image", 8, 0, ProductType.BackgroundRemoval, ModelTier.Standard),
        new("fal-ai/image-editing/object-removal", "Object Removal", "Remove any object and reconstruct the background", 8, 0, ProductType.BackgroundRemoval, ModelTier.Standard),
        new("fal-ai/ideogram/v3/edit", "Ideogram Inpaint", "Ideogram V3 masked region inpainting with style control", 12, 0, ProductType.BackgroundRemoval, ModelTier.Premium),
        new("fal-ai/iclight-v2", "IC-Light v2", "AI relighting, change scene lighting via text prompt", 25, 0, ProductType.BackgroundRemoval, ModelTier.Premium),
        new("fal-ai/image-apps-v2/headshot-photo", "Pro Headshot", "Turn any portrait into a polished professional headshot", 8, 0, ProductType.BackgroundRemoval, ModelTier.Standard),
        new("fal-ai/image-apps-v2/makeup-application", "Makeup Artist", "Apply realistic makeup styles with adjustable intensity", 8, 0, ProductType.BackgroundRemoval, ModelTier.Standard),
        new("fal-ai/flux-2-lora-gallery/ballpoint-pen-sketch", "Pen Sketch", "Convert image to ballpoint pen sketch style artwork", 6, 0, ProductType.BackgroundRemoval, ModelTier.Standard),
        new("fal-ai/flux-2-lora-gallery/digital-comic-art", "Digital Comic", "Transform photo into digital comic book illustration", 6, 0, ProductType.BackgroundRemoval, ModelTier.Standard),
        new("fal-ai/flux-2-lora-gallery/sepia-vintage", "Sepia Vintage", "Apply sepia-toned vintage photography aesthetic", 6, 0, ProductType.BackgroundRemoval, ModelTier.Free),
        new("fal-ai/flux-2-lora-gallery/face-to-full-portrait", "Face to Portrait", "Extend a face crop into a full-body portrait", 6, 0, ProductType.BackgroundRemoval, ModelTier.Standard),
        new("fal-ai/flux-2-lora-gallery/virtual-tryon", "Virtual Try-On", "Dress a person in any garment, realistic try-on", 6, 0, ProductType.BackgroundRemoval, ModelTier.Standard),
        new("fal-ai/qwen-image-edit-plus-lora-gallery/integrate-product", "Product Integration", "Seamlessly blend product into a background scene", 9, 0, ProductType.BackgroundRemoval, ModelTier.Standard),

        new("fal-ai/minimax/speech-2.8-hd", "MiniMax Speech 2.8 HD", "Latest MiniMax HD, emotion and pitch control", 15, 0, ProductType.Voice, ModelTier.Premium),
        new("fal-ai/f5-tts", "F5-TTS", "Clone any voice from a 15-30s audio sample", 15, 0, ProductType.Voice, ModelTier.Premium),
        new("fal-ai/kokoro/american-english", "Kokoro American English", "Natural US English voices, 20+ options", 4, 0, ProductType.Voice, ModelTier.Free),
        new("fal-ai/kokoro/british-english", "Kokoro British English", "British accent voices", 4, 0, ProductType.Voice, ModelTier.Free),
        new("fal-ai/kokoro/spanish", "Kokoro Spanish", "Spanish language Kokoro voices", 4, 0, ProductType.Voice, ModelTier.Free),
        new("fal-ai/kokoro/french", "Kokoro French", "French language Kokoro voices", 4, 0, ProductType.Voice, ModelTier.Free),
        new("fal-ai/kokoro/japanese", "Kokoro Japanese", "Japanese language Kokoro voices", 4, 0, ProductType.Voice, ModelTier.Free),
        new("fal-ai/kokoro/brazilian-portuguese", "Kokoro Portuguese", "Brazilian Portuguese Kokoro voices", 4, 0, ProductType.Voice, ModelTier.Free),
        new("fal-ai/kokoro/hindi", "Kokoro Hindi", "Hindi language Kokoro voices", 4, 0, ProductType.Voice, ModelTier.Free),
        new("fal-ai/kokoro/mandarin-chinese", "Kokoro Mandarin", "Mandarin Chinese Kokoro voices", 4, 0, ProductType.Voice, ModelTier.Free),
        new("fal-ai/kokoro/italian", "Kokoro Italian", "Italian language Kokoro voices", 4, 0, ProductType.Voice, ModelTier.Free),
        new("fal-ai/elevenlabs/tts/eleven-v3", "ElevenLabs Eleven v3", "Latest ElevenLabs model with superior expressiveness", 15, 0, ProductType.Voice, ModelTier.Premium),
        new("fal-ai/elevenlabs/tts/turbo-v2.5", "ElevenLabs Turbo v2.5", "Fast ElevenLabs with high quality output", 8, 0, ProductType.Voice, ModelTier.Premium),
        new("fal-ai/elevenlabs/tts/multilingual-v2", "ElevenLabs Multilingual v2", "Multilingual voice synthesis with 29 languages", 15, 0, ProductType.Voice, ModelTier.Standard),

        new("fal-ai/whisper", "Whisper", "OpenAI Whisper large, accurate, multi-language", 10, 0, ProductType.Transcription, ModelTier.Free),
        new("fal-ai/wizper", "Wizper", "Optimised Whisper with segment merging", 10, 0, ProductType.Transcription, ModelTier.Free),
        new("fal-ai/elevenlabs/speech-to-text", "ElevenLabs Scribe v1", "Premium transcription with speaker diarization", 18, 0, ProductType.Transcription, ModelTier.Premium),
        new("fal-ai/elevenlabs/speech-to-text/scribe-v2", "ElevenLabs Scribe v2", "Latest Scribe, word-level timestamps, 99 languages", 22, 0, ProductType.Transcription, ModelTier.Premium),
    };

    public static IReadOnlyList<ModelInfo> AllModels => All;

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

    public static int CalculateImageGenCredits(string modelId, string? quality, string? imageSize, string? resolution)
    {
        var model = Get(modelId) ?? throw new InvalidOperationException($"Unknown model: {modelId}");

        if (modelId == "fal-ai/nano-banana-2")
            return (resolution ?? "1K") switch { "0.5K" => 12, "2K" => 24, "4K" => 32, _ => 16 };

        if (modelId == "fal-ai/nano-banana-pro")
            return resolution == "4K" ? 45 : 22;

        return model.CreditsBase;
    }
}
