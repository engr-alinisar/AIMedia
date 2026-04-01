using System.Security.Cryptography;
using System.Text;
using Hangfire.Dashboard;

namespace AiMedia.API.Security;

public sealed class HangfireBasicAuthFilter(string username, string password) : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        if (!httpContext.Request.Headers.TryGetValue("Authorization", out var authorizationHeader))
        {
            Challenge(httpContext);
            return false;
        }

        var headerValue = authorizationHeader.ToString();
        if (!headerValue.StartsWith("Basic ", StringComparison.OrdinalIgnoreCase))
        {
            Challenge(httpContext);
            return false;
        }

        string decodedCredentials;
        try
        {
            var encodedCredentials = headerValue["Basic ".Length..].Trim();
            decodedCredentials = Encoding.UTF8.GetString(Convert.FromBase64String(encodedCredentials));
        }
        catch
        {
            Challenge(httpContext);
            return false;
        }

        var separatorIndex = decodedCredentials.IndexOf(':');
        if (separatorIndex < 0)
        {
            Challenge(httpContext);
            return false;
        }

        var providedUsername = decodedCredentials[..separatorIndex];
        var providedPassword = decodedCredentials[(separatorIndex + 1)..];

        if (!SecureEquals(providedUsername, username) || !SecureEquals(providedPassword, password))
        {
            Challenge(httpContext);
            return false;
        }

        return true;
    }

    private static bool SecureEquals(string left, string right) =>
        CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(left),
            Encoding.UTF8.GetBytes(right));

    private static void Challenge(HttpContext httpContext)
    {
        httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
        httpContext.Response.Headers["WWW-Authenticate"] = "Basic realm=\"Hangfire Dashboard\"";
    }
}
