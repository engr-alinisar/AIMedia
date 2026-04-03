namespace AiMedia.API.Security;

public static class FileSignatureValidator
{
    public static bool TryDetectImage(Stream stream, out string contentType, out string extension)
    {
        contentType = string.Empty;
        extension = string.Empty;

        Span<byte> header = stackalloc byte[16];
        var read = ReadHeader(stream, header);

        if (read >= 8 &&
            header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
            header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A)
        {
            contentType = "image/png";
            extension = ".png";
            return true;
        }

        if (read >= 3 &&
            header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            contentType = "image/jpeg";
            extension = ".jpg";
            return true;
        }

        if (read >= 6 &&
            header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 &&
            header[3] == 0x38 && (header[4] == 0x37 || header[4] == 0x39) && header[5] == 0x61)
        {
            contentType = "image/gif";
            extension = ".gif";
            return true;
        }

        if (read >= 12 &&
            header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
            header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50)
        {
            contentType = "image/webp";
            extension = ".webp";
            return true;
        }

        return false;
    }

    public static bool TryDetectAudio(Stream stream, out string contentType, out string extension)
    {
        contentType = string.Empty;
        extension = string.Empty;

        Span<byte> header = stackalloc byte[16];
        var read = ReadHeader(stream, header);

        if (read >= 12 &&
            header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
            header[8] == 0x57 && header[9] == 0x41 && header[10] == 0x56 && header[11] == 0x45)
        {
            contentType = "audio/wav";
            extension = ".wav";
            return true;
        }

        if (read >= 4 &&
            header[0] == 0x4F && header[1] == 0x67 && header[2] == 0x67 && header[3] == 0x53)
        {
            contentType = "audio/ogg";
            extension = ".ogg";
            return true;
        }

        if (read >= 3 &&
            header[0] == 0x49 && header[1] == 0x44 && header[2] == 0x33)
        {
            contentType = "audio/mpeg";
            extension = ".mp3";
            return true;
        }

        if (read >= 2 && header[0] == 0xFF && (header[1] & 0xE0) == 0xE0)
        {
            contentType = "audio/mpeg";
            extension = ".mp3";
            return true;
        }

        if (read >= 12 &&
            header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70)
        {
            contentType = "audio/mp4";
            extension = ".m4a";
            return true;
        }

        return false;
    }

    public static bool TryDetectVideo(Stream stream, out string contentType, out string extension)
    {
        contentType = string.Empty;
        extension = string.Empty;

        Span<byte> header = stackalloc byte[16];
        var read = ReadHeader(stream, header);

        // MP4 / MOV-style ISO BMFF container
        if (read >= 12 &&
            header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70)
        {
            contentType = "video/mp4";
            extension = ".mp4";
            return true;
        }

        // WebM / Matroska EBML header
        if (read >= 4 &&
            header[0] == 0x1A && header[1] == 0x45 && header[2] == 0xDF && header[3] == 0xA3)
        {
            contentType = "video/webm";
            extension = ".webm";
            return true;
        }

        return false;
    }

    private static int ReadHeader(Stream stream, Span<byte> buffer)
    {
        if (!stream.CanSeek)
            throw new InvalidOperationException("Upload stream must support seeking for signature validation.");

        var originalPosition = stream.Position;
        stream.Position = 0;
        var read = stream.Read(buffer);
        stream.Position = originalPosition;
        return read;
    }
}
