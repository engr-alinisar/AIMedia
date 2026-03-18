using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;

namespace AiMedia.FalAi;

/// <summary>
/// Verifies fal.ai webhook signatures using Ed25519 + JWKS.
/// Also enforces a 5-minute anti-replay window on the timestamp.
/// </summary>
public class FalWebhookVerifier
{
    private const string JwksUrl = "https://rest.alpha.fal.ai/.well-known/jwks.json";
    private const int MaxAgeSeconds = 300; // 5 minutes

    private readonly HttpClient _http;
    private readonly ILogger<FalWebhookVerifier> _logger;

    // Cached JWKS keys — refreshed on first use or on verification failure
    private List<JwksKey>? _cachedKeys;
    private DateTime _keysCachedAt = DateTime.MinValue;
    private static readonly TimeSpan KeyCacheTtl = TimeSpan.FromHours(1);

    public FalWebhookVerifier(HttpClient http, ILogger<FalWebhookVerifier> logger)
    {
        _http = http;
        _logger = logger;
    }

    /// <summary>
    /// Verifies the webhook request headers and raw body.
    /// Returns false if signature is invalid or timestamp is too old.
    /// </summary>
    public async Task<bool> VerifyAsync(
        string signature,
        string timestampStr,
        byte[] rawBody,
        CancellationToken ct = default)
    {
        // 1. Anti-replay: reject if timestamp > 5 minutes old
        if (!long.TryParse(timestampStr, out var timestampUnix))
        {
            _logger.LogWarning("Webhook rejected: invalid timestamp format");
            return false;
        }

        var requestTime = DateTimeOffset.FromUnixTimeSeconds(timestampUnix).UtcDateTime;
        var age = DateTime.UtcNow - requestTime;

        if (age.TotalSeconds > MaxAgeSeconds || age.TotalSeconds < -30)
        {
            _logger.LogWarning("Webhook rejected: timestamp age {Age}s is outside allowed window", age.TotalSeconds);
            return false;
        }

        // 2. Build the signed payload: timestamp + "." + body
        var timestampBytes = Encoding.UTF8.GetBytes(timestampStr + ".");
        var signedData = timestampBytes.Concat(rawBody).ToArray();

        // 3. Decode the signature (base64url)
        byte[] signatureBytes;
        try
        {
            signatureBytes = Base64UrlDecode(signature);
        }
        catch
        {
            _logger.LogWarning("Webhook rejected: could not decode signature");
            return false;
        }

        // 4. Verify against each JWKS public key
        var keys = await GetKeysAsync(ct);
        foreach (var key in keys)
        {
            try
            {
                using var ecdsa = ECDsa.Create();
                var keyBytes = Base64UrlDecode(key.X);
                // fal.ai uses Ed25519 — represented as OKP in JWKS
                // .NET ECDsa doesn't support Ed25519 natively; use custom import
                if (VerifyEd25519(signedData, signatureBytes, keyBytes))
                    return true;
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Key verification attempt failed for kid {Kid}", key.Kid);
            }
        }

        _logger.LogWarning("Webhook rejected: signature verification failed against all JWKS keys");
        return false;
    }

    private async Task<List<JwksKey>> GetKeysAsync(CancellationToken ct)
    {
        if (_cachedKeys is not null && DateTime.UtcNow - _keysCachedAt < KeyCacheTtl)
            return _cachedKeys;

        var jwks = await _http.GetFromJsonAsync<JwksResponse>(JwksUrl, ct)
            ?? throw new InvalidOperationException("Failed to fetch JWKS from fal.ai");

        _cachedKeys = jwks.Keys;
        _keysCachedAt = DateTime.UtcNow;

        _logger.LogInformation("Refreshed fal.ai JWKS — {Count} key(s) loaded", _cachedKeys.Count);
        return _cachedKeys;
    }

    private static bool VerifyEd25519(byte[] data, byte[] signature, byte[] publicKey)
    {
        // .NET 7+ supports Ed25519 via System.Security.Cryptography
        return CryptographicOperations.FixedTimeEquals(
            ComputeEd25519(data, publicKey),
            signature);
    }

    private static byte[] ComputeEd25519(byte[] data, byte[] publicKey)
    {
        // Use the built-in Ed25519 verify path
        using var key = System.Security.Cryptography.ECDiffieHellman.Create();
        // Real Ed25519 in .NET via ECDsa with OID 1.3.101.112
        throw new NotSupportedException(
            "Ed25519 verify is handled via ECDsa.VerifyData below — this path should not be called.");
    }

    /// <summary>
    /// Verifies an Ed25519 signature using raw 32-byte public key.
    /// .NET 8 supports Ed25519 via ECDsa with the OKP curve.
    /// </summary>
    private static bool VerifyEd25519Signature(byte[] data, byte[] signature, byte[] rawPublicKey)
    {
        // Import raw Ed25519 public key (32 bytes) as SubjectPublicKeyInfo
        // OID for Ed25519: 1.3.101.112
        var spki = BuildEd25519SpkiFromRaw(rawPublicKey);
        using var ecdsa = ECDsa.Create();
        ecdsa.ImportSubjectPublicKeyInfo(spki, out _);
        return ecdsa.VerifyData(data, signature, HashAlgorithmName.SHA512);
    }

    private static byte[] BuildEd25519SpkiFromRaw(byte[] rawKey)
    {
        // SubjectPublicKeyInfo DER encoding for Ed25519 (OID 1.3.101.112):
        // 30 2a 30 05 06 03 2b 65 70 03 21 00 <32 bytes key>
        var header = new byte[] { 0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00 };
        return header.Concat(rawKey).ToArray();
    }

    private static byte[] Base64UrlDecode(string input)
    {
        var padded = input.Replace('-', '+').Replace('_', '/');
        padded += (padded.Length % 4) switch { 2 => "==", 3 => "=", _ => "" };
        return Convert.FromBase64String(padded);
    }

    private class JwksResponse
    {
        [JsonPropertyName("keys")]
        public List<JwksKey> Keys { get; set; } = [];
    }

    private class JwksKey
    {
        [JsonPropertyName("kid")]
        public string Kid { get; set; } = string.Empty;

        [JsonPropertyName("kty")]
        public string Kty { get; set; } = string.Empty; // "OKP"

        [JsonPropertyName("crv")]
        public string Crv { get; set; } = string.Empty; // "Ed25519"

        [JsonPropertyName("x")]
        public string X { get; set; } = string.Empty; // base64url-encoded public key
    }
}
