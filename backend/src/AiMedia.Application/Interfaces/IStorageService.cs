namespace AiMedia.Application.Interfaces;

public interface IStorageService
{
    Task<string> UploadAsync(Stream stream, string key, string contentType, CancellationToken cancellationToken = default);
    Task<string> GetPresignedUrlAsync(string key, TimeSpan expiry);
    Task DeleteAsync(string key, CancellationToken cancellationToken = default);
    Task<Stream> DownloadAsync(string url, CancellationToken cancellationToken = default);
    string BuildKey(Guid userId, Guid jobId, string filename);
}
