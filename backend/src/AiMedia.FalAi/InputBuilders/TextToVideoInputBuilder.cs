namespace AiMedia.FalAi.InputBuilders;

public static class TextToVideoInputBuilder
{
    public static object Build(
        string prompt,
        int durationSeconds = 5,
        string aspectRatio = "16:9",
        string? negativePrompt = null)
    {
        return new
        {
            prompt,
            duration = durationSeconds,
            aspect_ratio = aspectRatio,
            negative_prompt = negativePrompt
        };
    }
}
