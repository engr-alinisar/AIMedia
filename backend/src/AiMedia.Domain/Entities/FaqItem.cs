namespace AiMedia.Domain.Entities;

public class FaqItem
{
    public int Id { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // e.g. "Credits", "Payments", "Models"
    public int Order { get; set; } // for sorting within category
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
