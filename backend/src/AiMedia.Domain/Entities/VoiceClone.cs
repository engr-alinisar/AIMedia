namespace AiMedia.Domain.Entities;

public class VoiceClone
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    /// <summary>For F5-TTS: stores the R2 public URL used as ref_audio_url.</summary>
    public string FalVoiceId { get; set; } = string.Empty;
    public string SampleR2Key { get; set; } = string.Empty;
    /// <summary>Exact transcript of the audio sample — required by F5-TTS for accurate cloning.</summary>
    public string ReferenceText { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastUsedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
