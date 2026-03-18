using System.Text.Json.Serialization;

namespace AiMedia.FalAi.Models;

public class FalJobStatus
{
    [JsonPropertyName("request_id")]
    public string RequestId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty; // "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED"

    [JsonPropertyName("queue_position")]
    public int? QueuePosition { get; set; }

    [JsonPropertyName("response_url")]
    public string? ResponseUrl { get; set; }
}
