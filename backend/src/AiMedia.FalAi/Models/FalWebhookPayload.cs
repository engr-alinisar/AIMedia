using System.Text.Json;
using System.Text.Json.Serialization;

namespace AiMedia.FalAi.Models;

public class FalWebhookPayload
{
    [JsonPropertyName("request_id")]
    public string RequestId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty; // "OK" | "ERROR"

    [JsonPropertyName("payload")]
    public JsonDocument? Payload { get; set; }

    [JsonPropertyName("error")]
    public FalWebhookError? Error { get; set; }
}

public class FalWebhookError
{
    [JsonPropertyName("msg")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public int StatusCode { get; set; }
}
