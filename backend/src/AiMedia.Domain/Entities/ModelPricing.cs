namespace AiMedia.Domain.Entities;

public class ModelPricing
{
    public string ModelId { get; set; } = string.Empty;
    public int CreditsBase { get; set; }
    public int CreditsPerSecond { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
