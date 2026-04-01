using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using AiMedia.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;

namespace AiMedia.Infrastructure.Storage;

public class R2StorageService : IStorageService
{
    private static readonly string[] DefaultAllowedDownloadHosts = ["fal.media", "fal.run"];
    private readonly AmazonS3Client _client;
    private readonly string _bucketName;
    private readonly string _publicBaseUrl;
    private readonly ILogger<R2StorageService> _logger;
    private readonly HttpClient _httpClient;
    private readonly string[] _allowedDownloadHosts;

    public R2StorageService(IConfiguration config, ILogger<R2StorageService> logger, HttpClient httpClient)
    {
        _logger = logger;
        _httpClient = httpClient;
        _allowedDownloadHosts = config.GetSection("FalAi:AllowedDownloadHosts").Get<string[]>()
            ?? config["FAL_ALLOWED_DOWNLOAD_HOSTS"]?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            ?? DefaultAllowedDownloadHosts;

        // Support both Cloudflare__R2__* (Railway nested) and CF_R2_* (flat env var) naming conventions
        _bucketName = Get(config, "Cloudflare:R2:BucketName", "CF_R2_BUCKET_NAME") ?? "ai-media-outputs";
        _publicBaseUrl = (Get(config, "Cloudflare:R2:PublicUrl", "CF_R2_PUBLIC_URL") ?? "").TrimEnd('/');

        var accountId  = Get(config, "Cloudflare:R2:AccountId",   "CF_R2_ACCOUNT_ID")
            ?? throw new InvalidOperationException("R2 AccountId not configured. Set Cloudflare__R2__AccountId or CF_R2_ACCOUNT_ID.");
        var accessKeyId = Get(config, "Cloudflare:R2:AccessKeyId", "CF_R2_ACCESS_KEY_ID")
            ?? throw new InvalidOperationException("R2 AccessKeyId not configured. Set Cloudflare__R2__AccessKeyId or CF_R2_ACCESS_KEY_ID.");
        var secretKey  = Get(config, "Cloudflare:R2:SecretKey",   "CF_R2_SECRET_KEY")
            ?? throw new InvalidOperationException("R2 SecretKey not configured. Set Cloudflare__R2__SecretKey or CF_R2_SECRET_KEY.");

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

    public string GetPublicUrl(string key) =>
        string.IsNullOrEmpty(_publicBaseUrl)
            ? throw new InvalidOperationException("Cloudflare:R2:PublicUrl is not configured.")
            : $"{_publicBaseUrl}/{key}";

    public async Task DeleteAsync(string key, CancellationToken cancellationToken = default)
    {
        await _client.DeleteObjectAsync(_bucketName, key, cancellationToken);
        _logger.LogInformation("Deleted from R2: {Key}", key);
    }

    public async Task<Stream> DownloadAsync(string url, CancellationToken cancellationToken = default)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            throw new InvalidOperationException("Output URL is not a valid absolute URI.");

        if (!string.Equals(uri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Only HTTPS output URLs are allowed.");

        if (IPAddress.TryParse(uri.Host, out _))
            throw new InvalidOperationException("Direct IP output URLs are not allowed.");

        if (!_allowedDownloadHosts.Any(allowedHost =>
                string.Equals(uri.Host, allowedHost, StringComparison.OrdinalIgnoreCase) ||
                uri.Host.EndsWith($".{allowedHost}", StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException($"Output URL host '{uri.Host}' is not in the allowed download host list.");
        }

        _logger.LogInformation("Downloading output from approved host {Host}", uri.Host);
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
        return $"{userId}/outputs/{now.Year}/{now.Month:D2}/{jobId}/{filename}";
    }

    /// <summary>
    /// Reads a config value by trying the nested key first (Cloudflare:R2:*),
    /// then the flat env-var key (CF_R2_*). Returns null only when both are absent or empty.
    /// </summary>
    private static string? Get(IConfiguration config, string nestedKey, string flatKey)
    {
        var v = config[nestedKey];
        if (!string.IsNullOrWhiteSpace(v)) return v;
        v = config[flatKey];
        return string.IsNullOrWhiteSpace(v) ? null : v;
    }
}
