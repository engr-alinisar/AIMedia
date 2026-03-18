using AiMedia.Application.Common;
using AiMedia.Domain.Enums;

namespace AiMedia.Tests;

public class CreditCalculatorTests
{
    // Image Generation
    [Fact] public void ImageGen_Free()     => Assert.Equal(5,  CreditCalculator.Calculate(ProductType.ImageGen, ModelTier.Free));
    [Fact] public void ImageGen_Standard() => Assert.Equal(8,  CreditCalculator.Calculate(ProductType.ImageGen, ModelTier.Standard));
    [Fact] public void ImageGen_Premium()  => Assert.Equal(11, CreditCalculator.Calculate(ProductType.ImageGen, ModelTier.Premium));

    // Image to Video (5s default)
    [Fact] public void ImageToVideo_Free_5s()     => Assert.Equal(25,  CreditCalculator.Calculate(ProductType.ImageToVideo, ModelTier.Free,     5));
    [Fact] public void ImageToVideo_Standard_5s() => Assert.Equal(90,  CreditCalculator.Calculate(ProductType.ImageToVideo, ModelTier.Standard, 5));
    [Fact] public void ImageToVideo_Premium_5s()  => Assert.Equal(150, CreditCalculator.Calculate(ProductType.ImageToVideo, ModelTier.Premium,  5));

    // Text to Video (5s default)
    [Fact] public void TextToVideo_Free_5s()     => Assert.Equal(25,  CreditCalculator.Calculate(ProductType.TextToVideo, ModelTier.Free,     5));
    [Fact] public void TextToVideo_Standard_5s() => Assert.Equal(90,  CreditCalculator.Calculate(ProductType.TextToVideo, ModelTier.Standard, 5));
    [Fact] public void TextToVideo_Premium_5s()  => Assert.Equal(150, CreditCalculator.Calculate(ProductType.TextToVideo, ModelTier.Premium,  5));

    // Voice
    [Fact] public void Voice_Free()     => Assert.Equal(4,  CreditCalculator.Calculate(ProductType.Voice, ModelTier.Free));
    [Fact] public void Voice_Standard() => Assert.Equal(18, CreditCalculator.Calculate(ProductType.Voice, ModelTier.Standard));
    [Fact] public void Voice_Premium()  => Assert.Equal(18, CreditCalculator.Calculate(ProductType.Voice, ModelTier.Premium));

    // Transcription
    [Fact] public void Transcription_Free()     => Assert.Equal(10, CreditCalculator.Calculate(ProductType.Transcription, ModelTier.Free));
    [Fact] public void Transcription_Standard() => Assert.Equal(10, CreditCalculator.Calculate(ProductType.Transcription, ModelTier.Standard));
    [Fact] public void Transcription_Premium()  => Assert.Equal(18, CreditCalculator.Calculate(ProductType.Transcription, ModelTier.Premium));

    // Background Removal
    [Fact] public void BackgroundRemoval_Free()     => Assert.Equal(3, CreditCalculator.Calculate(ProductType.BackgroundRemoval, ModelTier.Free));
    [Fact] public void BackgroundRemoval_Standard() => Assert.Equal(3, CreditCalculator.Calculate(ProductType.BackgroundRemoval, ModelTier.Standard));
    [Fact] public void BackgroundRemoval_Premium()  => Assert.Equal(3, CreditCalculator.Calculate(ProductType.BackgroundRemoval, ModelTier.Premium));

    // Duration scaling
    [Fact] public void ImageToVideo_Premium_10s() => Assert.Equal(300, CreditCalculator.Calculate(ProductType.ImageToVideo, ModelTier.Premium, 10));
    [Fact] public void TextToVideo_Standard_3s()  => Assert.Equal(54,  CreditCalculator.Calculate(ProductType.TextToVideo,  ModelTier.Standard, 3));
}
