namespace AiMedia.FalAi.InputBuilders;

public static class VoiceCloneInputBuilder
{
    public static object Build(string audioUrl, string voiceName)
    {
        return new
        {
            audio_url = audioUrl,
            voice_name = voiceName
        };
    }
}
