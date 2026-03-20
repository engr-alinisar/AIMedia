using System.Security.Claims;
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

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp", "image/gif" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { error = "Only JPG, PNG, WEBP and GIF images are allowed." });

        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                             ?? User.FindFirst("sub")?.Value
                             ?? throw new UnauthorizedAccessException());

        var uploadId = Guid.NewGuid();
        var ext = Path.GetExtension(file.FileName).ToLower();
        var key = $"{userId}/inputs/{uploadId}{ext}";

        await using var stream = file.OpenReadStream();
        await storage.UploadAsync(stream, key, file.ContentType, ct);

        var url = storage.GetPublicUrl(key);
        return Ok(new { url });
    }

    [HttpPost("audio")]
    [RequestSizeLimit(20 * 1024 * 1024)] // 20MB
    public async Task<IActionResult> UploadAudio(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        var allowedTypes = new[] { "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4",
                                   "audio/x-wav", "audio/wave", "audio/x-m4a", "audio/aac" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { error = "Only audio files are allowed (MP3, WAV, OGG, M4A)." });

        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                             ?? User.FindFirst("sub")?.Value
                             ?? throw new UnauthorizedAccessException());

        var uploadId = Guid.NewGuid();
        var ext = Path.GetExtension(file.FileName).ToLower();
        var key = $"{userId}/inputs/{uploadId}{ext}";

        await using var stream = file.OpenReadStream();
        await storage.UploadAsync(stream, key, file.ContentType, ct);

        // Return public URL — required so fal.ai can download the image from R2
        var url = storage.GetPublicUrl(key);
        return Ok(new { url });
    }
}
