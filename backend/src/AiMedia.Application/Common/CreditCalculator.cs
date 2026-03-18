using AiMedia.Domain.Enums;

namespace AiMedia.Application.Common;

public static class CreditCalculator
{
    // 1 credit = $0.01 USD. Target margin: 33-50% on fal.ai cost.
    public static int Calculate(ProductType product, ModelTier tier, int durationSeconds = 5) =>
        (product, tier) switch
        {
            // Image Generation (per image)
            (ProductType.ImageGen, ModelTier.Free)     =>  5,   // fal cost ~$0.025
            (ProductType.ImageGen, ModelTier.Standard) =>  8,   // fal cost ~$0.040
            (ProductType.ImageGen, ModelTier.Premium)  => 11,   // fal cost ~$0.055

            // Image to Video (per second of video generated)
            (ProductType.ImageToVideo, ModelTier.Free)     =>  5 * durationSeconds,  // ~$0.03/s
            (ProductType.ImageToVideo, ModelTier.Standard) => 18 * durationSeconds,  // $0.112/s
            (ProductType.ImageToVideo, ModelTier.Premium)  => 30 * durationSeconds,  // $0.20/s

            // Text to Video (per second)
            (ProductType.TextToVideo, ModelTier.Free)     =>  5 * durationSeconds,
            (ProductType.TextToVideo, ModelTier.Standard) => 18 * durationSeconds,
            (ProductType.TextToVideo, ModelTier.Premium)  => 30 * durationSeconds,

            // Voice TTS (per 1000 characters)
            (ProductType.Voice, ModelTier.Free)     =>  4,   // Kokoro $0.02/1K chars
            (ProductType.Voice, ModelTier.Standard) => 18,   // MiniMax $0.10/1K chars
            (ProductType.Voice, ModelTier.Premium)  => 18,

            // Transcription (per 30 minutes of audio)
            (ProductType.Transcription, ModelTier.Free)    => 10,
            (ProductType.Transcription, ModelTier.Standard)=> 10,
            (ProductType.Transcription, ModelTier.Premium) => 18,

            // Background Removal (per image)
            (ProductType.BackgroundRemoval, _) => 3,

            _ => throw new NotSupportedException($"No credit cost defined for {product}/{tier}")
        };
}
