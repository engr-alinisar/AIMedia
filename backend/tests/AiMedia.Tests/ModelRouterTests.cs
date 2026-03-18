using AiMedia.Domain.Enums;
using AiMedia.FalAi;

namespace AiMedia.Tests;

public class ModelRouterTests
{
    private readonly ModelRouter _router = new();

    // Image Generation
    [Fact] public void ImageGen_Free()     => Assert.Equal("fal-ai/flux/dev",        _router.GetEndpoint(ProductType.ImageGen, ModelTier.Free));
    [Fact] public void ImageGen_Standard() => Assert.Equal("fal-ai/flux-pro/v1.1",   _router.GetEndpoint(ProductType.ImageGen, ModelTier.Standard));
    [Fact] public void ImageGen_Premium()  => Assert.Equal("fal-ai/flux-pro/v2",     _router.GetEndpoint(ProductType.ImageGen, ModelTier.Premium));

    // Image to Video
    [Fact] public void ImageToVideo_Free()     => Assert.Equal("fal-ai/wan/i2v",                              _router.GetEndpoint(ProductType.ImageToVideo, ModelTier.Free));
    [Fact] public void ImageToVideo_Standard() => Assert.Equal("fal-ai/kling-video/v3/pro/image-to-video",    _router.GetEndpoint(ProductType.ImageToVideo, ModelTier.Standard));
    [Fact] public void ImageToVideo_Premium()  => Assert.Equal("fal-ai/veo3/image-to-video",                  _router.GetEndpoint(ProductType.ImageToVideo, ModelTier.Premium));

    // Text to Video
    [Fact] public void TextToVideo_Free()     => Assert.Equal("fal-ai/wan/t2v",                             _router.GetEndpoint(ProductType.TextToVideo, ModelTier.Free));
    [Fact] public void TextToVideo_Standard() => Assert.Equal("fal-ai/kling-video/v3/pro/text-to-video",    _router.GetEndpoint(ProductType.TextToVideo, ModelTier.Standard));
    [Fact] public void TextToVideo_Premium()  => Assert.Equal("fal-ai/veo3/text-to-video",                  _router.GetEndpoint(ProductType.TextToVideo, ModelTier.Premium));

    // Voice
    [Fact] public void Voice_Free()     => Assert.Equal("fal-ai/kokoro",                  _router.GetEndpoint(ProductType.Voice, ModelTier.Free));
    [Fact] public void Voice_Standard() => Assert.Equal("fal-ai/minimax/speech-02-hd",    _router.GetEndpoint(ProductType.Voice, ModelTier.Standard));
    [Fact] public void Voice_Premium()  => Assert.Equal("fal-ai/minimax/speech-02-hd",    _router.GetEndpoint(ProductType.Voice, ModelTier.Premium));

    // Transcription
    [Fact] public void Transcription_Free()     => Assert.Equal("fal-ai/whisper",                      _router.GetEndpoint(ProductType.Transcription, ModelTier.Free));
    [Fact] public void Transcription_Standard() => Assert.Equal("fal-ai/whisper",                      _router.GetEndpoint(ProductType.Transcription, ModelTier.Standard));
    [Fact] public void Transcription_Premium()  => Assert.Equal("fal-ai/elevenlabs/speech-to-text",    _router.GetEndpoint(ProductType.Transcription, ModelTier.Premium));

    // Background Removal (all tiers map to same endpoint)
    [Fact] public void BackgroundRemoval_Free()     => Assert.Equal("fal-ai/pixelcut/remove-background", _router.GetEndpoint(ProductType.BackgroundRemoval, ModelTier.Free));
    [Fact] public void BackgroundRemoval_Standard() => Assert.Equal("fal-ai/pixelcut/remove-background", _router.GetEndpoint(ProductType.BackgroundRemoval, ModelTier.Standard));
    [Fact] public void BackgroundRemoval_Premium()  => Assert.Equal("fal-ai/pixelcut/remove-background", _router.GetEndpoint(ProductType.BackgroundRemoval, ModelTier.Premium));

    // Voice clone endpoint
    [Fact] public void VoiceCloneEndpoint() => Assert.Equal("fal-ai/minimax/voice-clone", _router.VoiceCloneEndpoint);
}
