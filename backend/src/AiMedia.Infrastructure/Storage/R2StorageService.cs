using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using AiMedia.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AiMedia.Infrastructure.Storage;

public class R2StorageService : IStorageService
{
    private readonly AmazonS3Client _client;
    private readonly string _bucketName;
    private readonly ILogger<R2StorageService> _logger;
    private readonly HttpClient _httpClient;

    public R2StorageService(IConfiguration config, ILogger<R2StorageService> logger, HttpClient httpClient)
    {
        _logger = logger;
        _httpClient = httpClient;
        _bucketName = config["Cloudflare:R2:BucketName"] ?? "ai-media-outputs";

        var accountId = config["Cloudflare:R2:AccountId"] ?? throw new InvalidOperationException("R2AccountId not configured");
        var accessKeyId = config["Cloudflare:R2:AccessKeyId"] ?? throw new InvalidOperationException("R2AccessKeyId not configured");
        var secretKey = config["Cloudflare:R2:SecretKey"] ?? throw new InvalidOperationException("R2SecretKey not configured");

        var s3Config = new AmazonS3Config
        {
            ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com",
            // REQUIRED for Cloudflare R2 — disables AWS-specific checksum validation
            RequestChecksumCalculation = RequestChecksumCalculation.WHEN_REQUIRED,
            ResponseChecksumValidation = ResponseChecksumValidation.WHEN_REQUIRED
        };

        _client = new AmazonS3Client(accessKeyId, secretKey, s3Config);
    }

    public async Task<string> UploadAsync(Stream stream, string key, string contentType, CancellationToken cancellationToken = default)
    {
        var request = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = key,
            InputStream = stream,
            ContentType = contentType,
            DisablePayloadSigning = true,            // REQUIRED for R2
            DisableDefaultChecksumValidation = true  // REQUIRED for R2
        };

        await _client.PutObjectAsync(request, cancellationToken);
        _logger.LogInformation("Uploaded to R2: {Key}", key);
        return key;
    }

    public async Task<string> GetPresignedUrlAsync(string key, TimeSpan expiry)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = key,
            Expires = DateTime.UtcNow.Add(expiry),
            Protocol = Protocol.HTTPS
        };

        var url = await _client.GetPreSignedURLAsync(request);
        return url;
    }

    public async Task DeleteAsync(string key, CancellationToken cancellationToken = default)
    {
        await _client.DeleteObjectAsync(_bucketName, key, cancellationToken);
        _logger.LogInformation("Deleted from R2: {Key}", key);
    }

    public async Task<Stream> DownloadAsync(string url, CancellationToken cancellationToken = default)
    {
        var response = await _httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();
        // Copy to memory stream so the underlying connection can be released
        var ms = new MemoryStream();
        await response.Content.CopyToAsync(ms, cancellationToken);
        ms.Position = 0;
        return ms;
    }

    /// <summary>Key format: {userId}/{year}/{month}/{jobId}/{filename}</summary>
    public string BuildKey(Guid userId, Guid jobId, string filename)
    {
        var now = DateTime.UtcNow;
        return $"{userId}/{now.Year}/{now.Month:D2}/{jobId}/{filename}";
    }
}
