namespace AiMedia.FalAi.InputBuilders;

public static class ImageGenInputBuilder
{
    public static object Build(
        string prompt,
        int width = 1024,
        int height = 1024,
        string? negativePrompt = null,
        int numImages = 1)
    {
        return new
        {
            prompt,
            image_size = new { width, height },
            negative_prompt = negativePrompt,
            num_images = numImages,
            enable_safety_checker = true
        };
    }
}
