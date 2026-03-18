namespace AiMedia.FalAi.InputBuilders;

public static class ImageToVideoInputBuilder
{
    public static object Build(
        string imageUrl,
        string? prompt = null,
        int durationSeconds = 5,
        string aspectRatio = "16:9")
    {
        return new
        {
            image_url = imageUrl,
            prompt,
            duration = durationSeconds,
            aspect_ratio = aspectRatio
        };
    }
}
