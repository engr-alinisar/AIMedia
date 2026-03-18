namespace AiMedia.Domain.Entities;

public class VoiceClone
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string FalVoiceId { get; set; } = string.Empty;
    public string SampleR2Key { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastUsedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
