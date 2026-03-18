using System.Text.Json.Serialization;

namespace AiMedia.FalAi.Models;

/// <summary>Response from POST queue.fal.run/{endpoint}</summary>
public class FalQueueResponse
{
    [JsonPropertyName("request_id")]
    public string RequestId { get; set; } = string.Empty;

    [JsonPropertyName("response_url")]
    public string? ResponseUrl { get; set; }

    [JsonPropertyName("status_url")]
    public string? StatusUrl { get; set; }

    [JsonPropertyName("cancel_url")]
    public string? CancelUrl { get; set; }
}
