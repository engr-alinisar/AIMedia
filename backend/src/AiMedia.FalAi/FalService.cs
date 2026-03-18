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

    public FalService(HttpClient http, ILogger<FalService> logger)
    {
        _http = http;
        _logger = logger;
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
        response.EnsureSuccessStatusCode();

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

    public async Task<string?> GetResultUrlAsync(string endpoint, string requestId, CancellationToken ct = default)
    {
        var result = await GetResultAsync<AiMedia.FalAi.Models.FalOutputUrls>(endpoint, requestId, ct);
        return result?.GetFirstUrl();
    }

    public async Task<string> SubmitJobAsync(
        string endpoint, object input, string webhookUrl,
        CancellationToken cancellationToken = default)
    {
        var result = await SubmitAsync(endpoint, input, webhookUrl, cancellationToken);
        return result.RequestId;
    }

    public async Task<FalJobStatusResult> GetJobStatusAsync(
        string requestId, CancellationToken cancellationToken = default)
    {
        // requestId format from fal is "{endpoint}/{id}" — split to get endpoint
        var parts = requestId.Split('/', 2);
        if (parts.Length < 2)
            throw new ArgumentException($"Expected requestId in format 'endpoint/id', got: {requestId}");

        var endpoint = parts[0];
        var status = await GetStatusAsync(endpoint, parts[1], cancellationToken);
        return new FalJobStatusResult(status.Status, status.ResponseUrl, null, null);
    }
}
