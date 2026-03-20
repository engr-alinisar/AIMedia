using System.Text;
using System.Text.Json;
using AiMedia.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace AiMedia.Infrastructure.Services;

public class EmailService(IConfiguration config, ILogger<EmailService> logger, HttpClient http)
    : IEmailService
{
    private readonly string? _apiKey = config["RESEND_API_KEY"] ?? config["Email:ResendApiKey"];
    private readonly string _fromEmail = config["Email:FromEmail"] ?? "noreply@voicesforge.com";
    private readonly string _fromName = config["Email:FromName"] ?? "AiMedia";
    private readonly string _appUrl = (config["APP_URL"] ?? config["Email:AppUrl"] ?? "http://localhost:4200").TrimEnd('/');

    public async Task SendVerificationEmailAsync(string toEmail, string fullName, string token, CancellationToken ct = default)
    {
        var verifyUrl = $"{_appUrl}/verify-email?token={token}";

        if (string.IsNullOrEmpty(_apiKey))
        {
            // Development fallback — log the link so it can be tested without email setup
            logger.LogWarning("RESEND_API_KEY not configured. Verification link for {Email}: {Url}", toEmail, verifyUrl);
            return;
        }

        var html = BuildVerificationEmail(fullName, verifyUrl);

        var payload = new
        {
            from = $"{_fromName} <{_fromEmail}>",
            to = new[] { toEmail },
            subject = "Verify your AiMedia email address",
            html
        };

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);

        var response = await http.PostAsync("https://api.resend.com/emails", content, ct);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Failed to send verification email to {Email}. Status: {Status}. Body: {Body}",
                toEmail, response.StatusCode, body);
        }
        else
        {
            logger.LogInformation("Verification email sent to {Email}", toEmail);
        }
    }

    private static string BuildVerificationEmail(string fullName, string verifyUrl) => $"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#6d28d9,#7c3aed);padding:32px 40px;text-align:center;">
                      <table cellpadding="0" cellspacing="0" align="center">
                        <tr>
                          <td style="vertical-align:middle;padding-right:12px;">
                            <table cellpadding="0" cellspacing="0">
                              <tr>
                                <td width="44" height="44" style="width:44px;height:44px;background:rgba(255,255,255,0.2);border-radius:10px;text-align:center;vertical-align:middle;font-size:20px;line-height:44px;font-family:Arial,sans-serif;color:#ffffff;font-style:normal;">
                                  &#x25B6;&#xFE0E;
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td style="vertical-align:middle;text-align:left;">
                            <div style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">AiMedia</div>
                            <div style="color:rgba(255,255,255,0.75);font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;">AI-POWERED MEDIA</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px;">
                      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:600;">Verify your email address</h2>
                      <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                        Hi {fullName},<br><br>
                        Thanks for signing up! Click the button below to verify your email address and activate your account with <strong>100 free credits</strong>.
                      </p>
                      <div style="text-align:center;margin:32px 0;">
                        <a href="{verifyUrl}"
                           style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.2px;">
                          Verify Email Address
                        </a>
                      </div>
                      <p style="margin:24px 0 0;color:#9ca3af;font-size:13px;line-height:1.6;">
                        This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.<br><br>
                        Or copy and paste this URL into your browser:<br>
                        <a href="{verifyUrl}" style="color:#7c3aed;word-break:break-all;">{verifyUrl}</a>
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                      <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 AiMedia. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;
}
