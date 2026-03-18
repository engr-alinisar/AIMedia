using AiMedia.Domain.Enums;

namespace AiMedia.Application.DTOs;

public class JobDto
{
    public Guid Id { get; set; }
    public ProductType Product { get; set; }
    public ModelTier Tier { get; set; }
    public JobStatus Status { get; set; }
    public int CreditsReserved { get; set; }
    public int CreditsCharged { get; set; }
    public string? OutputUrl { get; set; }
    public string? ErrorMessage { get; set; }
    public int DurationSeconds { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
