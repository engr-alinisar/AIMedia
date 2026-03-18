using AiMedia.Domain.Enums;

namespace AiMedia.FalAi;

/// <summary>
/// Single source of truth for all fal.ai endpoint mappings.
/// Maps (ProductType, ModelTier) → fal.ai endpoint string.
/// </summary>
public class ModelRouter
{
    public string GetEndpoint(ProductType product, ModelTier tier) =>
        (product, tier) switch
        {
            // Image Generation
            (ProductType.ImageGen, ModelTier.Free)     => "fal-ai/flux/dev",
            (ProductType.ImageGen, ModelTier.Standard) => "fal-ai/flux-pro/v1.1",
            (ProductType.ImageGen, ModelTier.Premium)  => "fal-ai/flux-pro/v2",

            // Image to Video
            (ProductType.ImageToVideo, ModelTier.Free)     => "fal-ai/wan/i2v",
            (ProductType.ImageToVideo, ModelTier.Standard) => "fal-ai/kling-video/v3/pro/image-to-video",
            (ProductType.ImageToVideo, ModelTier.Premium)  => "fal-ai/veo3/image-to-video",

            // Text to Video
            (ProductType.TextToVideo, ModelTier.Free)     => "fal-ai/wan/t2v",
            (ProductType.TextToVideo, ModelTier.Standard) => "fal-ai/kling-video/v3/pro/text-to-video",
            (ProductType.TextToVideo, ModelTier.Premium)  => "fal-ai/veo3/text-to-video",

            // Voice / TTS
            (ProductType.Voice, ModelTier.Free)     => "fal-ai/kokoro",
            (ProductType.Voice, ModelTier.Standard) => "fal-ai/minimax/speech-02-hd",
            (ProductType.Voice, ModelTier.Premium)  => "fal-ai/minimax/speech-02-hd",

            // Transcription
            (ProductType.Transcription, ModelTier.Free)     => "fal-ai/whisper",
            (ProductType.Transcription, ModelTier.Standard) => "fal-ai/whisper",
            (ProductType.Transcription, ModelTier.Premium)  => "fal-ai/elevenlabs/speech-to-text",

            // Background Removal (tier-independent)
            (ProductType.BackgroundRemoval, _) => "fal-ai/pixelcut/remove-background",

            _ => throw new NotSupportedException($"No endpoint for {product}/{tier}")
        };

    /// <summary>Endpoint used to clone a voice sample (always MiniMax).</summary>
    public string VoiceCloneEndpoint => "fal-ai/minimax/voice-clone";
}
