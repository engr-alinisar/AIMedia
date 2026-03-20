using System.Net.Http.Json;
using System.Text.Json;
using AiMedia.Application.Interfaces;
using AiMedia.FalAi.Models;
using Microsoft.Extensions.Logging;

namespace AiMedia.FalAi;

public class FalService : IFalClient
{
    private readonly HttpClient _http;
    private readonly ILogger<FalService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    public string WebhookBaseUrl { get; }

    public FalService(HttpClient http, ILogger<FalService> logger, Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        _http = http;
        _logger = logger;
        WebhookBaseUrl = configuration["FalAi:WebhookBaseUrl"]
                      ?? configuration["FAL_WEBHOOK_BASE_URL"]
                      ?? "http://localhost:5015";
    }

    /// <summary>
    /// Submits a job to the fal.ai queue and returns the FalRequestId.
    /// Uses webhook mode — fal.ai calls back when done.
    /// </summary>
    public async Task<FalQueueResponse> SubmitAsync(
        string endpoint,
        object input,
        string webhookUrl,
        CancellationToken ct = default)
    {
        var url = $"https://queue.fal.run/{endpoint}?fal_webhook={Uri.EscapeDataString(webhookUrl)}";

        _logger.LogInformation("Submitting job to fal.ai endpoint {Endpoint}", endpoint);

        var response = await _http.PostAsJsonAsync(url, input, JsonOptions, ct);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogError("fal.ai returned {Status} for {Endpoint}: {Body}", (int)response.StatusCode, endpoint, body);
            throw new HttpRequestException($"fal.ai {(int)response.StatusCode}: {body}");
        }

        var result = await response.Content.ReadFromJsonAsync<FalQueueResponse>(JsonOptions, ct)
            ?? throw new InvalidOperationException("fal.ai returned empty queue response");

        _logger.LogInformation("Job queued with fal RequestId {RequestId}", result.RequestId);
        return result;
    }

    /// <summary>
    /// Polls fal.ai for the current status of a job.
    /// Used as a fallback when webhooks are missed.
    /// </summary>
    public async Task<FalJobStatus> GetStatusAsync(
        string endpoint,
        string requestId,
        CancellationToken ct = default)
    {
        var url = $"https://queue.fal.run/{endpoint}/requests/{requestId}/status";

        var status = await _http.GetFromJsonAsync<FalJobStatus>(url, JsonOptions, ct)
            ?? throw new InvalidOperationException($"fal.ai returned empty status for {requestId}");

        return status;
    }

    /// <summary>
    /// Fetches the full result payload for a completed job.
    /// </summary>
    public async Task<T?> GetResultAsync<T>(
        string endpoint,
        string requestId,
        CancellationToken ct = default)
    {
        var url = $"https://queue.fal.run/{endpoint}/requests/{requestId}";
        return await _http.GetFromJsonAsync<T>(url, JsonOptions, ct);
    }

    /// <summary>
    /// Cancels a queued job on fal.ai.
    /// </summary>
    public async Task CancelAsync(string endpoint, string requestId, CancellationToken ct = default)
    {
        var url = $"https://queue.fal.run/{endpoint}/requests/{requestId}/cancel";
        var response = await _http.PutAsync(url, null, ct);
        response.EnsureSuccessStatusCode();
        _logger.LogInformation("Cancelled fal job {RequestId}", requestId);
    }

    // IFalClient implementation

    public async Task<FalSubmitResult> SubmitJobAsync(
        string endpoint, object input, string webhookUrl,
        CancellationToken cancellationToken = default)
    {
        var result = await SubmitAsync(endpoint, input, webhookUrl, cancellationToken);
        return new FalSubmitResult(result.RequestId, result.StatusUrl, result.ResponseUrl);
    }

    /// <summary>
    /// Polls fal.ai for job status using the exact status_url returned at submission time.
    /// </summary>
    public async Task<FalJobStatusResult> GetJobStatusAsync(
        string statusUrl, CancellationToken cancellationToken = default)
    {
        var status = await _http.GetFromJsonAsync<FalJobStatus>(statusUrl, JsonOptions, cancellationToken)
            ?? throw new InvalidOperationException($"fal.ai returned empty status for {statusUrl}");
        return new FalJobStatusResult(status.Status, status.ResponseUrl, null, null);
    }

    /// <summary>
    /// Fetches the result using the exact response_url returned at submission time.
    /// Returns null (instead of throwing) when fal.ai returns 4xx/5xx — caller should treat as failure.
    /// </summary>
    public async Task<string?> GetResultUrlAsync(string responseUrl, CancellationToken ct = default)
    {
        var output = await GetResultOutputAsync(responseUrl, ct);
        return output?.Url;
    }

    /// <summary>
    /// Fetches both the output URL and output text from a completed fal.ai job.
    /// Transcription jobs return Text only; all other jobs return Url only.
    /// Returns null on failure.
    /// </summary>
    public async Task<AiMedia.Application.Interfaces.FalResultOutput?> GetResultOutputAsync(string responseUrl, CancellationToken ct = default)
    {
        var response = await _http.GetAsync(responseUrl, ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning(
                "GetResultOutputAsync: fal.ai returned {Status} for response URL — treating as failed. Body: {Body}",
                (int)response.StatusCode, body);
            return null;
        }

        var result = await response.Content.ReadFromJsonAsync<AiMedia.FalAi.Models.FalOutputUrls>(JsonOptions, ct);
        if (result is null) return null;

        return new AiMedia.Application.Interfaces.FalResultOutput(result.GetFirstUrl(), result.Text);
    }
}
