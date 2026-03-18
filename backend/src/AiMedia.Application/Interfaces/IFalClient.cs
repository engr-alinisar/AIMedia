namespace AiMedia.Application.Interfaces;

public interface IFalClient
{
    Task<string> SubmitJobAsync(string endpoint, object input, string webhookUrl, CancellationToken cancellationToken = default);
    Task<FalJobStatusResult> GetJobStatusAsync(string requestId, CancellationToken cancellationToken = default);
    Task<string?> GetResultUrlAsync(string endpoint, string requestId, CancellationToken ct = default);
}

public record FalJobStatusResult(string Status, string? OutputUrl, string? ErrorMessage, object? RawOutput);
