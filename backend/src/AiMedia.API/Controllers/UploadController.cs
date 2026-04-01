using System.Security.Claims;
using AiMedia.API.Security;
using AiMedia.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AiMedia.API.Controllers;

[Authorize]
[ApiController]
[Route("api/upload")]
public class UploadController(IStorageService storage) : ControllerBase
{
    [HttpPost]
    [RequestSizeLimit(20 * 1024 * 1024)] // 20MB
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                             ?? User.FindFirst("sub")?.Value
                             ?? throw new UnauthorizedAccessException());

        var uploadId = Guid.NewGuid();
        await using var stream = file.OpenReadStream();
        if (!FileSignatureValidator.TryDetectImage(stream, out var contentType, out var extension))
            return BadRequest(new { error = "Only valid JPG, PNG, WEBP and GIF images are allowed." });

        var key = $"{userId}/inputs/{uploadId}{extension}";
        await storage.UploadAsync(stream, key, contentType, ct);

        var url = storage.GetPublicUrl(key);
        return Ok(new { url });
    }

    [HttpPost("audio")]
    [RequestSizeLimit(20 * 1024 * 1024)] // 20MB
    public async Task<IActionResult> UploadAudio(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                             ?? User.FindFirst("sub")?.Value
                             ?? throw new UnauthorizedAccessException());

        var uploadId = Guid.NewGuid();
        await using var stream = file.OpenReadStream();
        if (!FileSignatureValidator.TryDetectAudio(stream, out var contentType, out var extension))
            return BadRequest(new { error = "Only valid audio files are allowed (MP3, WAV, OGG, M4A)." });

        var key = $"{userId}/inputs/{uploadId}{extension}";
        await storage.UploadAsync(stream, key, contentType, ct);

        // Return public URL — required so fal.ai can download the image from R2
        var url = storage.GetPublicUrl(key);
        return Ok(new { url });
    }
}
