using System.Security.Cryptography;
using System.Text;

namespace AiMedia.Application.Common;

public static class FalWebhookSecurity
{
    public static string ComputeToken(Guid jobId, string secret)
    {
        var key = Encoding.UTF8.GetBytes(secret);
        var message = Encoding.UTF8.GetBytes(jobId.ToString("D"));

        using var hmac = new HMACSHA256(key);
        return Convert.ToHexString(hmac.ComputeHash(message));
    }

    public static bool IsValid(Guid jobId, string providedToken, string secret)
    {
        if (string.IsNullOrWhiteSpace(providedToken) || string.IsNullOrWhiteSpace(secret))
            return false;

        var expectedToken = ComputeToken(jobId, secret);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expectedToken),
            Encoding.UTF8.GetBytes(providedToken));
    }
}
