using AiMedia.Domain.Enums;

namespace AiMedia.API.Hubs;

public interface IGenerationHubClient
{
    Task JobUpdate(JobStatusUpdate update);
}

public class JobStatusUpdate
{
    public Guid JobId { get; set; }
    public JobStatus Status { get; set; }
    public string? OutputUrl { get; set; }
    public int CreditsCharged { get; set; }
    public string? ErrorMessage { get; set; }
}
