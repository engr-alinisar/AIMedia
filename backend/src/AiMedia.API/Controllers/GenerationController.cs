using System.Security.Claims;
using AiMedia.Application.Commands.GenerateBackgroundRemoval;
using AiMedia.Application.Commands.GenerateImage;
using AiMedia.Application.Commands.GenerateImageToVideo;
using AiMedia.Application.Commands.GenerateTextToVideo;
using AiMedia.Application.Commands.GenerateTranscription;
using AiMedia.Application.Commands.GenerateVoice;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AiMedia.API.Controllers;

[Authorize]
[ApiController]
[Route("api/generate")]
public class GenerationController : ControllerBase
{
    private readonly IMediator _mediator;

    public GenerationController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("image")]
    public async Task<IActionResult> Image([FromBody] GenerateImageRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new GenerateImageCommand(
            GetUserId(), request.Prompt, request.ModelId,
            request.ImageSize, request.NegativePrompt, request.IsPublic, request.Zone,
            request.AspectRatio, request.Style, request.Quality, request.Background, request.Resolution), ct);
        return Accepted(result);
    }

    [HttpPost("image-to-video")]
    public async Task<IActionResult> ImageToVideo([FromBody] GenerateImageToVideoRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new GenerateImageToVideoCommand(
            GetUserId(), request.ImageUrl, request.Prompt,
            request.ModelId, request.DurationSeconds, request.IsPublic,
            request.Resolution, request.MultiShot, request.GenerateAudio,
            request.AspectRatio, request.Zone, request.EndImageUrl,
            request.NegativePrompt, request.CfgScale, request.MultiPrompts,
            request.Elements?.Select(e => new KlingElement(e.ImageUrl, e.ReferenceImages, e.VideoUrl)).ToList(),
            request.PromptOptimizer, request.Seed, request.AutoFix), ct);
        return Accepted(result);
    }

    [HttpPost("text-to-video")]
    public async Task<IActionResult> TextToVideo([FromBody] GenerateTextToVideoRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new GenerateTextToVideoCommand(
            GetUserId(), request.Prompt, request.ModelId,
            request.DurationSeconds, request.AspectRatio, request.IsPublic,
            request.Resolution, request.MultiShot, request.GenerateAudio, request.Zone), ct);
        return Accepted(result);
    }

    [HttpPost("voice")]
    public async Task<IActionResult> Voice([FromBody] GenerateVoiceRequest request, CancellationToken ct)
    {
        Guid? cloneId = request.VoiceCloneId.HasValue ? request.VoiceCloneId
            : request.VoiceCloneIdStr is not null && Guid.TryParse(request.VoiceCloneIdStr, out var parsed)
                ? parsed : null;

        var result = await _mediator.Send(new GenerateVoiceCommand(
            UserId: GetUserId(),
            Text: request.Text,
            ModelId: request.ModelId,
            VoiceId: request.VoiceId,
            VoiceCloneId: cloneId,
            RefAudioUrl: request.RefAudioUrl,
            IsPublic: request.IsPublic,
            Zone: request.Zone,
            Speed: request.Speed,
            Stability: request.Stability,
            SimilarityBoost: request.SimilarityBoost,
            VoiceStyle: request.VoiceStyle,
            LanguageCode: request.LanguageCode,
            Pitch: request.Pitch,
            Vol: request.Vol,
            Emotion: request.Emotion,
            Title: request.Title), ct);
        return Accepted(result);
    }

    [HttpPost("transcription")]
    public async Task<IActionResult> Transcription(
        [FromForm] TranscriptionRequest request,
        IFormFile? file,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new GenerateTranscriptionCommand(
            GetUserId(), request.ModelId,
            request.AudioUrl,
            file?.OpenReadStream(),
            file?.FileName,
            request.IsPublic, request.Zone,
            request.Language, request.Diarize, request.Task,
            request.TagAudioEvents), ct);
        return Accepted(result);
    }

    [HttpPost("background-removal")]
    public async Task<IActionResult> BackgroundRemoval(
        [FromForm] BackgroundRemovalRequest request,
        IFormFile? file,
        CancellationToken ct)
    {
        // Secondary image file (virtual try-on, product integration)
        IFormFile? secondaryFile = Request.Form.Files.Count > 1 ? Request.Form.Files[1] : null;

        var result = await _mediator.Send(new GenerateBackgroundRemovalCommand(
            GetUserId(),
            request.ImageUrl,
            file?.OpenReadStream(),
            file?.FileName,
            request.ModelId,
            request.IsPublic, request.Zone,
            request.Prompt, request.NegativePrompt,
            request.SecondaryImageUrl,
            secondaryFile?.OpenReadStream(),
            secondaryFile?.FileName,
            request.MaskUrl,
            request.BackgroundStyle, request.MakeupStyle, request.MakeupIntensity,
            request.RenderingSpeed, request.ImageSize), ct);
        return Accepted(result);
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value
               ?? throw new UnauthorizedAccessException("Invalid token.");
        return Guid.Parse(sub);
    }
}

public record GenerateImageRequest(
    string Prompt,
    string ModelId = "fal-ai/flux-pro/v1.1",
    string ImageSize = "square_hd",
    string? NegativePrompt = null,
    bool IsPublic = true,
    string? Zone = null,
    string? AspectRatio = null,
    string? Style = null,
    string? Quality = null,
    string? Background = null,
    string? Resolution = null);

public record KlingElementRequest(
    string? ImageUrl = null,
    List<string>? ReferenceImages = null,
    string? VideoUrl = null);

public record GenerateImageToVideoRequest(
    string ImageUrl,
    string ModelId = "fal-ai/kling-video/v3/pro/image-to-video",
    string? Prompt = null,
    int DurationSeconds = 5,
    bool IsPublic = true,
    string Resolution = "720p",
    bool MultiShot = false,
    bool GenerateAudio = true,
    string AspectRatio = "16:9",
    string? Zone = null,
    string? EndImageUrl = null,
    string? NegativePrompt = null,
    float? CfgScale = null,
    List<string>? MultiPrompts = null,
    List<KlingElementRequest>? Elements = null,
    bool PromptOptimizer = true,
    int? Seed = null,
    bool AutoFix = false);

public record GenerateTextToVideoRequest(
    string Prompt,
    string ModelId = "fal-ai/kling-video/v3/pro/text-to-video",
    int DurationSeconds = 5,
    string AspectRatio = "16:9",
    bool IsPublic = true,
    string Resolution = "720p",
    bool MultiShot = false,
    bool GenerateAudio = true,
    string? Zone = null);

public record GenerateVoiceRequest(
    string Text,
    string ModelId,
    string? VoiceId = null,
    Guid? VoiceCloneId = null,
    string? VoiceCloneIdStr = null,
    string? RefAudioUrl = null,
    bool IsPublic = true,
    string? Zone = null,
    float? Speed = null,
    float? Stability = null,
    float? SimilarityBoost = null,
    int? Pitch = null,
    float? Vol = null,
    string? Emotion = null,
    float? VoiceStyle = null,
    string? LanguageCode = null,
    string? Title = null);

public record TranscriptionRequest(
    string ModelId = "fal-ai/whisper",
    string? AudioUrl = null,
    bool IsPublic = true,
    string? Zone = null,
    string? Language = null,
    bool? Diarize = null,
    string? Task = null,
    bool? TagAudioEvents = null);

public record BackgroundRemovalRequest(
    string? ImageUrl = null,
    string ModelId = "fal-ai/bria/background/remove",
    bool IsPublic = true,
    string? Zone = null,
    string? Prompt = null,
    string? NegativePrompt = null,
    string? SecondaryImageUrl = null,
    string? MaskUrl = null,
    string? BackgroundStyle = null,
    string? MakeupStyle = null,
    string? MakeupIntensity = null,
    string? RenderingSpeed = null,
    string? ImageSize = null);
