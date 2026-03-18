namespace AiMedia.FalAi.InputBuilders;

public static class VoiceInputBuilder
{
    /// <param name="text">Text to synthesize.</param>
    /// <param name="voiceId">Pre-built voice ID (provider-specific).</param>
    /// <param name="customVoiceId">MiniMax custom_voice_id from a cloned voice.</param>
    public static object Build(string text, string? voiceId = null, string? customVoiceId = null)
    {
        if (customVoiceId is not null)
        {
            return new
            {
                text,
                voice_setting = new
                {
                    voice_type = "custom",
                    custom_voice_id = customVoiceId
                }
            };
        }

        return new
        {
            text,
            voice_id = voiceId ?? "af_heart" // Kokoro default
        };
    }
}
