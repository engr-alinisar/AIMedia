namespace AiMedia.FalAi.InputBuilders;

public static class BackgroundRemovalInputBuilder
{
    public static object Build(string imageUrl)
    {
        return new { image_url = imageUrl };
    }
}
