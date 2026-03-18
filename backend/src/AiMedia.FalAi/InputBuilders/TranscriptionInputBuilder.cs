namespace AiMedia.FalAi.InputBuilders;

public static class TranscriptionInputBuilder
{
    public static object Build(string audioUrl, string language = "en", bool diarize = false)
    {
        return new
        {
            audio_url = audioUrl,
            language,
            diarize,
            chunk_level = "word"
        };
    }
}
