using System.Text.Json;
using AiMedia.Domain.Enums;

namespace AiMedia.Domain.Entities;

public class GenerationJob
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public ProductType Product { get; set; }
    public ModelTier Tier { get; set; }
    public string FalEndpoint { get; set; } = string.Empty;
    public string FalRequestId { get; set; } = string.Empty;
    public JobStatus Status { get; set; } = JobStatus.Queued;
    public int CreditsReserved { get; set; }
    public int CreditsCharged { get; set; }
    public string? OutputR2Key { get; set; }
    public string? OutputUrl { get; set; }
    public JsonDocument? FalInput { get; set; }
    public JsonDocument? FalOutput { get; set; }
    public string? ErrorMessage { get; set; }
    public int DurationSeconds { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public User User { get; set; } = null!;
}
