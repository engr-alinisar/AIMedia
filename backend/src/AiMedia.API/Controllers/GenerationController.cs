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
            request.Width, request.Height, request.NegativePrompt), ct);
        return Accepted(result);
    }

    [HttpPost("image-to-video")]
    public async Task<IActionResult> ImageToVideo([FromBody] GenerateImageToVideoRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new GenerateImageToVideoCommand(
            GetUserId(), request.ImageUrl, request.Prompt,
            request.ModelId, request.DurationSeconds), ct);
        return Accepted(result);
    }

    [HttpPost("text-to-video")]
    public async Task<IActionResult> TextToVideo([FromBody] GenerateTextToVideoRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new GenerateTextToVideoCommand(
            GetUserId(), request.Prompt, request.ModelId,
            request.DurationSeconds, request.AspectRatio), ct);
        return Accepted(result);
    }

    [HttpPost("voice")]
    public async Task<IActionResult> Voice([FromBody] GenerateVoiceRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new GenerateVoiceCommand(
            GetUserId(), request.Text, request.ModelId,
            request.VoiceId, request.VoiceCloneId), ct);
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
            file?.FileName), ct);
        return Accepted(result);
    }

    [HttpPost("background-removal")]
    public async Task<IActionResult> BackgroundRemoval(
        [FromForm] BackgroundRemovalRequest request,
        IFormFile? file,
        CancellationToken ct)
    {
        var result = await _mediator.Send(new GenerateBackgroundRemovalCommand(
            GetUserId(),
            request.ImageUrl,
            file?.OpenReadStream(),
            file?.FileName,
            request.ModelId), ct);
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
    int Width = 1024,
    int Height = 1024,
    string? NegativePrompt = null);

public record GenerateImageToVideoRequest(
    string ImageUrl,
    string ModelId = "fal-ai/kling-video/v3/pro/image-to-video",
    string? Prompt = null,
    int DurationSeconds = 5);

public record GenerateTextToVideoRequest(
    string Prompt,
    string ModelId = "fal-ai/kling-video/v3/pro/text-to-video",
    int DurationSeconds = 5,
    string AspectRatio = "16:9");

public record GenerateVoiceRequest(
    string Text,
    string ModelId = "fal-ai/kokoro",
    string? VoiceId = null,
    Guid? VoiceCloneId = null);

public record TranscriptionRequest(
    string ModelId = "fal-ai/whisper",
    string? AudioUrl = null);

public record BackgroundRemovalRequest(
    string? ImageUrl = null,
    string ModelId = "fal-ai/pixelcut/remove-background");
