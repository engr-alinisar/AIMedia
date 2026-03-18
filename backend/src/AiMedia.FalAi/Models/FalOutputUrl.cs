using System.Text.Json.Serialization;

namespace AiMedia.FalAi.Models;

/// <summary>Extracts the first output URL from a fal.ai payload for any product type.</summary>
public class FalOutputUrls
{
    // Image gen: images[0].url
    [JsonPropertyName("images")]
    public List<FalMediaItem>? Images { get; set; }

    // Video: video.url
    [JsonPropertyName("video")]
    public FalMediaItem? Video { get; set; }

    // Audio / TTS: audio.url
    [JsonPropertyName("audio")]
    public FalMediaItem? Audio { get; set; }

    // Transcription: text (plain string, not a URL)
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    // Background removal: image.url
    [JsonPropertyName("image")]
    public FalMediaItem? Image { get; set; }

    public string? GetFirstUrl() =>
        Images?.FirstOrDefault()?.Url
        ?? Video?.Url
        ?? Audio?.Url
        ?? Image?.Url;
}

public class FalMediaItem
{
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("content_type")]
    public string? ContentType { get; set; }

    [JsonPropertyName("file_name")]
    public string? FileName { get; set; }
}
