using AiMedia.Infrastructure.Services;

namespace AiMedia.Tests;

public class ModelPricingServiceTests
{
    private readonly ModelPricingService service = new();

    [Fact]
    public async Task VoicePricing_Kokoro_ChargesFourCreditsPerThousand()
    {
        Assert.Equal(4, await service.GetVoiceCreditsAsync("fal-ai/kokoro/american-english", 1));
        Assert.Equal(4, await service.GetVoiceCreditsAsync("fal-ai/kokoro/american-english", 1000));
        Assert.Equal(8, await service.GetVoiceCreditsAsync("fal-ai/kokoro/american-english", 1001));
    }

    [Fact]
    public async Task VoicePricing_ElevenV3_ChargesFifteenCreditsPerThousand()
    {
        Assert.Equal(15, await service.GetVoiceCreditsAsync("fal-ai/elevenlabs/tts/eleven-v3", 1000));
        Assert.Equal(30, await service.GetVoiceCreditsAsync("fal-ai/elevenlabs/tts/eleven-v3", 1001));
    }

    [Fact]
    public async Task TranscriptionPricing_UsesDurationBasedRates()
    {
        Assert.Equal(3, await service.GetTranscriptionCreditsAsync("fal-ai/whisper", 60));
        Assert.Equal(10, await service.GetTranscriptionCreditsAsync("fal-ai/wizper", 60));
        Assert.Equal(5, await service.GetTranscriptionCreditsAsync("fal-ai/elevenlabs/speech-to-text", 60));
        Assert.Equal(1, await service.GetTranscriptionCreditsAsync("fal-ai/elevenlabs/speech-to-text/scribe-v2", 60));
    }

    [Fact]
    public async Task ImageGenPricing_IdeogramV3_UsesRenderingSpeedTiers()
    {
        Assert.Equal(10, await service.GetImageGenCreditsAsync("fal-ai/ideogram/v3", null, null, null, null, "TURBO"));
        Assert.Equal(10, await service.GetImageGenCreditsAsync("fal-ai/ideogram/v3", null, null, null, null, "BALANCED"));
        Assert.Equal(14, await service.GetImageGenCreditsAsync("fal-ai/ideogram/v3", null, null, null, null, "QUALITY"));
    }

    [Fact]
    public async Task ImageGenPricing_NanoBanana2_UsesResolutionAndThinkingLevel()
    {
        Assert.Equal(10, await service.GetImageGenCreditsAsync("fal-ai/nano-banana-2", null, null, "0.5K", "minimal"));
        Assert.Equal(12, await service.GetImageGenCreditsAsync("fal-ai/nano-banana-2", null, null, "1K", "minimal"));
        Assert.Equal(12, await service.GetImageGenCreditsAsync("fal-ai/nano-banana-2", null, null, "1K", "high"));
        Assert.Equal(24, await service.GetImageGenCreditsAsync("fal-ai/nano-banana-2", null, null, "4K", "minimal"));
    }

    [Fact]
    public async Task ImageStudioPricing_IdeogramEdit_UsesRenderingSpeedTiers()
    {
        Assert.Equal(6, await service.GetImageStudioCreditsAsync("fal-ai/ideogram/v3/edit", "TURBO"));
        Assert.Equal(12, await service.GetImageStudioCreditsAsync("fal-ai/ideogram/v3/edit", "BALANCED"));
        Assert.Equal(18, await service.GetImageStudioCreditsAsync("fal-ai/ideogram/v3/edit", "QUALITY"));
    }

    [Fact]
    public async Task VideoPricing_KlingV3_UsesAudioTier()
    {
        Assert.Equal(85, await service.GetVideoCreditsAsync("fal-ai/kling-video/v3/pro/text-to-video", 5, false));
        Assert.Equal(125, await service.GetVideoCreditsAsync("fal-ai/kling-video/v3/pro/text-to-video", 5, true));
    }

    [Fact]
    public async Task VideoPricing_Veo31Fast_UsesResolutionAndAudioTier()
    {
        Assert.Equal(60, await service.GetVideoCreditsAsync("fal-ai/veo3.1/fast", 4, false, "720p"));
        Assert.Equal(212, await service.GetVideoCreditsAsync("fal-ai/veo3.1/fast", 4, true, "4k"));
    }

    [Fact]
    public async Task VideoPricing_Hailuo20_UsesResolutionTier()
    {
        Assert.Equal(18, await service.GetVideoCreditsAsync("fal-ai/minimax/hailuo-02/standard/text-to-video", 6, false, "512P"));
        Assert.Equal(42, await service.GetVideoCreditsAsync("fal-ai/minimax/hailuo-02/standard/text-to-video", 6, false, "768P"));
    }

    [Fact]
    public async Task MotionControlPricing_UsesConfiguredPerSecondRates()
    {
        Assert.Equal(55, await service.GetMotionControlCreditsAsync("fal-ai/kling-video/v2.6/standard/motion-control", 5));
        Assert.Equal(125, await service.GetMotionControlCreditsAsync("fal-ai/kling-video/v3/pro/motion-control", 5));
    }
}
