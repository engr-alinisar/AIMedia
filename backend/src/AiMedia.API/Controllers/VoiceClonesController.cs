using System.Security.Claims;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.API.Controllers;

[Authorize]
[ApiController]
[Route("api/voice-clones")]
public class VoiceClonesController(IAppDbContext db, IStorageService storage) : ControllerBase
{
    /// <summary>List all voice clones for the current user.</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var userId = GetUserId();
        var clones = await db.VoiceClones
            .Where(v => v.UserId == userId)
            .OrderByDescending(v => v.CreatedAt)
            .Select(v => new VoiceCloneDto(v.Id, v.Name, v.Description, v.ReferenceText, v.CreatedAt, v.LastUsedAt))
            .ToListAsync(ct);

        return Ok(clones);
    }

    /// <summary>Create a new voice clone — upload audio sample + metadata.</summary>
    [HttpPost]
    [RequestSizeLimit(25 * 1024 * 1024)]
    public async Task<IActionResult> Create(
        [FromForm] CreateVoiceCloneRequest request,
        IFormFile file,
        CancellationToken ct)
    {
        var userId = GetUserId();

        if (file == null || file.Length == 0)
            return BadRequest(new { error = "Audio file is required." });

        var allowedTypes = new[] {
            "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4",
            "audio/x-wav", "audio/wave", "audio/x-m4a", "audio/aac"
        };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { error = "Only audio files are allowed (MP3, WAV, OGG, M4A)." });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { error = "Voice name is required." });

        if (string.IsNullOrWhiteSpace(request.ReferenceText))
            return BadRequest(new { error = "Reference text is required for accurate voice cloning." });

        var cloneId = Guid.NewGuid();
        var ext = Path.GetExtension(file.FileName).ToLower();
        if (string.IsNullOrEmpty(ext)) ext = ".mp3";
        var r2Key = $"{userId}/voice-clones/{cloneId}{ext}";

        await using var stream = file.OpenReadStream();
        await storage.UploadAsync(stream, r2Key, file.ContentType, ct);

        var clone = new VoiceClone
        {
            Id = cloneId,
            UserId = userId,
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            FalVoiceId = storage.GetPublicUrl(r2Key),
            SampleR2Key = r2Key,
            ReferenceText = request.ReferenceText.Trim(),
            CreatedAt = DateTime.UtcNow,
            LastUsedAt = DateTime.UtcNow
        };

        db.VoiceClones.Add(clone);
        await db.SaveChangesAsync(ct);

        return Ok(new VoiceCloneDto(clone.Id, clone.Name, clone.Description, clone.ReferenceText, clone.CreatedAt, clone.LastUsedAt));
    }

    /// <summary>Delete a voice clone.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();
        var clone = await db.VoiceClones
            .FirstOrDefaultAsync(v => v.Id == id && v.UserId == userId, ct);

        if (clone == null) return NotFound();

        db.VoiceClones.Remove(clone);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value
                ?? throw new UnauthorizedAccessException());
}

public record CreateVoiceCloneRequest(string Name, string? Description, string ReferenceText);

public record VoiceCloneDto(
    Guid Id, string Name, string? Description,
    string ReferenceText, DateTime CreatedAt, DateTime LastUsedAt);
