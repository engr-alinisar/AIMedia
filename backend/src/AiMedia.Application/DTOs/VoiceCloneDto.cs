namespace AiMedia.Application.DTOs;

public class VoiceCloneDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string FalVoiceId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime LastUsedAt { get; set; }
}
