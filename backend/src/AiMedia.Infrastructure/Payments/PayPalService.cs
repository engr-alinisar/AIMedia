using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using AiMedia.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AiMedia.Infrastructure.Payments;

public class PayPalService(HttpClient http, IConfiguration config, ILogger<PayPalService> logger) : IPayPalService
{
    private readonly string _clientId = config["PayPal:ClientId"]
        ?? throw new InvalidOperationException("PayPal:ClientId not configured");

    private readonly string _clientSecret = config["PayPal:ClientSecret"]
        ?? throw new InvalidOperationException("PayPal:ClientSecret not configured");

    private readonly string _baseUrl = string.Equals(config["PayPal:Mode"], "live", StringComparison.OrdinalIgnoreCase)
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";

    private readonly string _appUrl = config["APP_URL"] ?? "https://voicesforge.com";

    private async Task<string> GetAccessTokenAsync(CancellationToken ct)
    {
        var credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_clientId}:{_clientSecret}"));

        var req = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/v1/oauth2/token");
        req.Headers.Authorization = new AuthenticationHeaderValue("Basic", credentials);
        req.Content = new FormUrlEncodedContent([
            new KeyValuePair<string, string>("grant_type", "client_credentials")
        ]);

        var res = await http.SendAsync(req, ct);
        res.EnsureSuccessStatusCode();

        var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
        return doc.RootElement.GetProperty("access_token").GetString()!;
    }

    public async Task<string> CreateOrderAsync(string packId, decimal amount, Guid userId, CancellationToken ct = default)
    {
        var token = await GetAccessTokenAsync(ct);

        var body = new
        {
            intent = "CAPTURE",
            purchase_units = new[]
            {
                new
                {
                    custom_id = $"{userId}:{packId}",
                    amount = new { currency_code = "USD", value = amount.ToString("F2") },
                    description = $"VoicesForge Credits — {packId}"
                }
            },
            application_context = new
            {
                brand_name = "VoicesForge",
                user_action = "PAY_NOW",
                return_url = $"{_appUrl}/credits?paypal=success",
                cancel_url = $"{_appUrl}/credits?paypal=cancel"
            }
        };

        var req = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/v2/checkout/orders");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        var res = await http.SendAsync(req, ct);
        res.EnsureSuccessStatusCode();

        var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));

        var approvalUrl = doc.RootElement
            .GetProperty("links")
            .EnumerateArray()
            .First(l => l.GetProperty("rel").GetString() == "approve")
            .GetProperty("href")
            .GetString()!;

        logger.LogInformation("Created PayPal order for user {UserId} pack {PackId}", userId, packId);
        return approvalUrl;
    }

    public async Task<(bool Success, string CustomId)> CaptureOrderAsync(string orderId, CancellationToken ct = default)
    {
        var token = await GetAccessTokenAsync(ct);

        var req = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/v2/checkout/orders/{orderId}/capture");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        req.Content = new StringContent("{}", Encoding.UTF8, "application/json");

        var res = await http.SendAsync(req, ct);

        if (!res.IsSuccessStatusCode)
        {
            var error = await res.Content.ReadAsStringAsync(ct);
            logger.LogError("PayPal capture failed for order {OrderId}: {Error}", orderId, error);
            return (false, string.Empty);
        }

        var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
        var status = doc.RootElement.GetProperty("status").GetString();

        if (status != "COMPLETED")
        {
            logger.LogWarning("PayPal order {OrderId} status: {Status}", orderId, status);
            return (false, string.Empty);
        }

        var purchaseUnit = doc.RootElement.GetProperty("purchase_units")[0];

        // custom_id can be at purchase_unit level or inside captures
        string customId;
        if (purchaseUnit.TryGetProperty("custom_id", out var directCustomId))
        {
            customId = directCustomId.GetString() ?? string.Empty;
        }
        else if (purchaseUnit.TryGetProperty("payments", out var payments) &&
                 payments.TryGetProperty("captures", out var captures) &&
                 captures.GetArrayLength() > 0 &&
                 captures[0].TryGetProperty("custom_id", out var captureCustomId))
        {
            customId = captureCustomId.GetString() ?? string.Empty;
        }
        else
        {
            logger.LogError("PayPal order {OrderId} response missing custom_id. Response: {Response}",
                orderId, doc.RootElement.GetRawText());
            return (false, string.Empty);
        }

        logger.LogInformation("Captured PayPal order {OrderId}", orderId);
        return (true, customId);
    }
}
