namespace AiMedia.Application.Interfaces;

public interface IFalClient
{
    string WebhookBaseUrl { get; }
    Task<FalSubmitResult> SubmitJobAsync(string endpoint, object input, string webhookUrl, CancellationToken cancellationToken = default);
    Task<FalJobStatusResult> GetJobStatusAsync(string statusUrl, CancellationToken cancellationToken = default);
    Task<string?> GetResultUrlAsync(string responseUrl, CancellationToken ct = default);

    /// <summary>
    /// Fetches both the output URL and output text from a completed fal.ai job.
    /// Transcription jobs return Text only; all other jobs return Url only.
    /// Returns null on failure.
    /// </summary>
    Task<FalResultOutput?> GetResultOutputAsync(string responseUrl, CancellationToken ct = default);
}

public record FalSubmitResult(string RequestId, string? StatusUrl, string? ResponseUrl);
public record FalJobStatusResult(string Status, string? OutputUrl, string? ErrorMessage, object? RawOutput);
public record FalResultOutput(string? Url, string? Text);
