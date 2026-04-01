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
    private readonly string _supportEmail = config["Email:SupportEmail"] ?? "voicesforge@gmail.com";
    private readonly string _logoUrl = config["Email:LogoUrl"] ?? "https://voicesforge.com/logo.svg";

    public async Task SendVerificationEmailAsync(string toEmail, string fullName, string token, CancellationToken ct = default)
    {
        var verifyUrl = $"{_appUrl}/verify-email?token={token}";

        if (string.IsNullOrEmpty(_apiKey))
        {
            // Development fallback — log that email was skipped, never log the token/URL
            logger.LogWarning("RESEND_API_KEY not configured. Verification email skipped for {Email}. Set SkipEmailVerification=true in dev to bypass.", toEmail);
            return;
        }

        var html = BuildVerificationEmail(fullName, verifyUrl, _logoUrl);
        var payload = new
        {
            from = $"{_fromName} <{_fromEmail}>",
            to = new[] { toEmail },
            subject = "Verify your AiMedia email address",
            html
        };

        await SendEmailAsync(payload, ct);
        logger.LogInformation("Verification email sent to {Email}", toEmail);
    }

    public async Task SendReceiptEmailAsync(string toEmail, string fullName, string packName, int credits, decimal amount, string orderId, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            logger.LogWarning("RESEND_API_KEY not configured. Skipping receipt email for {Email}", toEmail);
            return;
        }

        var html = BuildReceiptEmail(fullName, packName, credits, amount, orderId, _appUrl, _logoUrl);
        var payload = new
        {
            from = $"{_fromName} <{_fromEmail}>",
            to = new[] { toEmail },
            subject = $"Your AiMedia receipt — {credits:N0} credits",
            html
        };

        await SendEmailAsync(payload, ct);
        logger.LogInformation("Receipt email sent to {Email} for order {OrderId}", toEmail, orderId);
    }

    public async Task SendLowCreditsEmailAsync(string toEmail, string fullName, int balance, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            logger.LogWarning("RESEND_API_KEY not configured. Skipping low credits email for {Email}", toEmail);
            return;
        }

        var creditsUrl = $"{_appUrl}/credits";
        var html = BuildLowCreditsEmail(fullName, balance, creditsUrl, _logoUrl);
        var payload = new
        {
            from = $"{_fromName} <{_fromEmail}>",
            to = new[] { toEmail },
            subject = "You're running low on AiMedia credits",
            html
        };

        await SendEmailAsync(payload, ct);
        logger.LogInformation("Low credits email sent to {Email} (balance: {Balance})", toEmail, balance);
    }

    public async Task SendPaymentDeclinedEmailAsync(string toEmail, string fullName, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            logger.LogWarning("RESEND_API_KEY not configured. Skipping payment declined email for {Email}", toEmail);
            return;
        }

        var creditsUrl = $"{_appUrl}/credits";
        var html = BuildPaymentDeclinedEmail(fullName, creditsUrl, _logoUrl);
        var payload = new
        {
            from = $"{_fromName} <{_fromEmail}>",
            to = new[] { toEmail },
            subject = "Your AiMedia payment was declined",
            html
        };

        await SendEmailAsync(payload, ct);
        logger.LogInformation("Payment declined email sent to {Email}", toEmail);
    }

    public async Task SendPaymentReversedEmailAsync(string toEmail, string fullName, int credits, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            logger.LogWarning("RESEND_API_KEY not configured. Skipping payment reversed email for {Email}", toEmail);
            return;
        }

        var creditsUrl = $"{_appUrl}/credits";
        var html = BuildPaymentReversedEmail(fullName, credits, creditsUrl, _logoUrl);
        var payload = new
        {
            from = $"{_fromName} <{_fromEmail}>",
            to = new[] { toEmail },
            subject = "Your AiMedia payment has been reversed",
            html
        };

        await SendEmailAsync(payload, ct);
        logger.LogInformation("Payment reversed email sent to {Email}", toEmail);
    }

    public async Task SendContactNotificationAsync(string name, string email, string subject, string message, Guid? userId, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            logger.LogWarning(
                "RESEND_API_KEY not configured. Contact notification from {Name} <{Email}> subject: {Subject}",
                name, email, subject);
            return;
        }

        var html = BuildContactNotificationEmail(name, email, subject, message, userId, _logoUrl);
        var payload = new
        {
            from = $"{_fromName} <{_fromEmail}>",
            to = new[] { _supportEmail },
            reply_to = email,
            subject = $"[AiMedia Support] {subject} — from {name}",
            html
        };

        await SendEmailAsync(payload, ct);
        logger.LogInformation("Contact notification email sent to support for {Name} <{Email}>", name, email);
    }

    public async Task SendContactAutoReplyAsync(string name, string toEmail, string message, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(_apiKey))
        {
            logger.LogWarning("RESEND_API_KEY not configured. Skipping contact auto-reply to {Email}", toEmail);
            return;
        }

        var faqUrl = $"{_appUrl}/faq";
        var html = BuildContactAutoReplyEmail(name, message, faqUrl, _supportEmail, _logoUrl);
        var payload = new
        {
            from = $"{_fromName} <{_fromEmail}>",
            to = new[] { toEmail },
            subject = "We received your message — AiMedia Support",
            html
        };

        await SendEmailAsync(payload, ct);
        logger.LogInformation("Contact auto-reply sent to {Email}", toEmail);
    }

    private async Task SendEmailAsync(object payload, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);

        var response = await http.PostAsync("https://api.resend.com/emails", content, ct);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(ct);
            logger.LogError("Failed to send email. Status: {Status}. Body: {Body}", response.StatusCode, body);
        }
    }

    private static string BuildReceiptEmail(string fullName, string packName, int credits, decimal amount, string orderId, string appUrl, string logoUrl) => $"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#6d28d9,#7c3aed);padding:32px 40px;text-align:center;">
                    <table cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">
                          <img src="{logoUrl}" width="44" height="44" alt="AiMedia" style="display:block;border-radius:10px;" />
                        </td>
                        <td style="vertical-align:middle;text-align:left;">
                          <div style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">AiMedia</div>
                          <div style="color:rgba(255,255,255,0.75);font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;">PAYMENT RECEIPT</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:600;">Thanks for your purchase!</h2>
                    <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">Hi {fullName}, your credits have been added to your account.</p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;overflow:hidden;margin-bottom:28px;">
                      <tr>
                        <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                          <span style="color:#6b7280;font-size:13px;">Package</span>
                          <span style="float:right;color:#111827;font-size:13px;font-weight:600;">{packName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                          <span style="color:#6b7280;font-size:13px;">Credits added</span>
                          <span style="float:right;color:#7c3aed;font-size:15px;font-weight:700;">+{credits:N0} credits</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                          <span style="color:#6b7280;font-size:13px;">Amount paid</span>
                          <span style="float:right;color:#111827;font-size:13px;font-weight:600;">${amount:F2} USD</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:16px 20px;">
                          <span style="color:#6b7280;font-size:13px;">Order ID</span>
                          <span style="float:right;color:#9ca3af;font-size:12px;font-family:monospace;">{orderId}</span>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                      If you have any questions, reply to this email or visit <a href="{appUrl}" style="color:#7c3aed;">{appUrl}</a>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 AiMedia. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;

    private static string BuildLowCreditsEmail(string fullName, int balance, string creditsUrl, string logoUrl) => $"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px 40px;text-align:center;">
                    <table cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">
                          <img src="{logoUrl}" width="44" height="44" alt="AiMedia" style="display:block;border-radius:10px;" />
                        </td>
                        <td style="vertical-align:middle;text-align:left;">
                          <div style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">AiMedia</div>
                          <div style="color:rgba(255,255,255,0.85);font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;">LOW CREDITS ALERT</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:600;">You're running low on credits</h2>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                      Hi {fullName},<br><br>
                      You only have <strong style="color:#d97706;">{balance} credits</strong> remaining. Top up now to keep generating without interruption.
                    </p>
                    <div style="text-align:center;margin:32px 0;">
                      <a href="{creditsUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;">
                        Buy Credits
                      </a>
                    </div>
                    <p style="margin:0;color:#9ca3af;font-size:12px;">You'll receive this reminder once when your balance drops below 50 credits.</p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 AiMedia. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;

    private static string BuildPaymentDeclinedEmail(string fullName, string creditsUrl, string logoUrl) => $"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 40px;text-align:center;">
                <table cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td style="vertical-align:middle;padding-right:12px;">
                      <img src="{logoUrl}" width="44" height="44" alt="AiMedia" style="display:block;border-radius:10px;" />
                    </td>
                    <td style="vertical-align:middle;text-align:left;">
                      <div style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">AiMedia</div>
                      <div style="color:rgba(255,255,255,0.85);font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;">PAYMENT DECLINED</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:600;">Your payment was declined</h2>
                <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                  Hi {fullName},<br><br>
                  Unfortunately your recent payment attempt was declined. No credits were added to your account and you have not been charged.
                </p>
                <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                  Please try again with a different payment method or contact your bank for more details.
                </p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="{creditsUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;">
                    Try Again
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 AiMedia. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;

    private static string BuildPaymentReversedEmail(string fullName, int credits, string creditsUrl, string logoUrl) => $"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:32px 40px;text-align:center;">
                <table cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    <td style="vertical-align:middle;padding-right:12px;">
                      <img src="{logoUrl}" width="44" height="44" alt="AiMedia" style="display:block;border-radius:10px;" />
                    </td>
                    <td style="vertical-align:middle;text-align:left;">
                      <div style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">AiMedia</div>
                      <div style="color:rgba(255,255,255,0.85);font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;">PAYMENT REVERSED</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:40px;">
                <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:600;">Your payment has been reversed</h2>
                <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                  Hi {fullName},<br><br>
                  A payment reversal has been processed on your account. <strong>{credits:N0} credits</strong> have been removed from your balance.
                </p>
                <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                  If you believe this is an error, please contact us and we'll resolve it immediately.
                </p>
                <div style="text-align:center;margin:32px 0;">
                  <a href="{creditsUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;">
                    View Balance
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 AiMedia. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;

    private static string BuildContactNotificationEmail(string name, string email, string subject, string message, Guid? userId, string logoUrl)
    {
        var userStatus = userId.HasValue
            ? $"<span style=\"display:inline-block;background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;\">Registered User ({userId})</span>"
            : "<span style=\"display:inline-block;background:#f3f4f6;color:#6b7280;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;\">Anonymous / Not logged in</span>";
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss") + " UTC";
        var escapedMessage = System.Net.WebUtility.HtmlEncode(message).Replace("\n", "<br>");

        return $"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#6d28d9,#7c3aed);padding:32px 40px;text-align:center;">
                    <table cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">
                          <img src="{logoUrl}" width="44" height="44" alt="AiMedia" style="display:block;border-radius:10px;" />
                        </td>
                        <td style="vertical-align:middle;text-align:left;">
                          <div style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">AiMedia</div>
                          <div style="color:rgba(255,255,255,0.75);font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;">SUPPORT REQUEST</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:600;">New contact form message</h2>
                    <p style="margin:0 0 28px;color:#6b7280;font-size:14px;">Received {timestamp}</p>

                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
                      <tr>
                        <td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;">
                          <span style="color:#6b7280;font-size:13px;font-weight:500;">From</span>
                          <span style="float:right;color:#111827;font-size:13px;font-weight:600;">{System.Net.WebUtility.HtmlEncode(name)} &lt;{System.Net.WebUtility.HtmlEncode(email)}&gt;</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 20px;border-bottom:1px solid #e5e7eb;">
                          <span style="color:#6b7280;font-size:13px;font-weight:500;">Subject</span>
                          <span style="float:right;color:#111827;font-size:13px;font-weight:600;">{System.Net.WebUtility.HtmlEncode(subject)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 20px;">
                          <span style="color:#6b7280;font-size:13px;font-weight:500;">User</span>
                          <span style="float:right;">{userStatus}</span>
                        </td>
                      </tr>
                    </table>

                    <div style="background:#f9fafb;border-radius:10px;padding:20px;border-left:4px solid #7c3aed;">
                      <p style="margin:0 0 10px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Message</p>
                      <p style="margin:0;color:#111827;font-size:15px;line-height:1.7;">{escapedMessage}</p>
                    </div>

                    <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.6;">
                      Reply directly to this email to respond to {System.Net.WebUtility.HtmlEncode(name)} — the Reply-To header is set to their address.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 AiMedia. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;
    }

    private static string BuildContactAutoReplyEmail(string name, string message, string faqUrl, string supportEmail, string logoUrl)
    {
        var escapedMessage = System.Net.WebUtility.HtmlEncode(message).Replace("\n", "<br>");

        return $"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <tr>
                  <td style="background:linear-gradient(135deg,#6d28d9,#7c3aed);padding:32px 40px;text-align:center;">
                    <table cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="vertical-align:middle;padding-right:12px;">
                          <img src="{logoUrl}" width="44" height="44" alt="AiMedia" style="display:block;border-radius:10px;" />
                        </td>
                        <td style="vertical-align:middle;text-align:left;">
                          <div style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;line-height:1.2;">AiMedia</div>
                          <div style="color:rgba(255,255,255,0.75);font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;">SUPPORT</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:600;">We received your message!</h2>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                      Hi {System.Net.WebUtility.HtmlEncode(name)}, thanks for reaching out!<br><br>
                      We've received your message and will get back to you within <strong>24 hours</strong>.
                    </p>

                    <div style="background:#f9fafb;border-radius:10px;padding:20px;border-left:4px solid #7c3aed;margin-bottom:28px;">
                      <p style="margin:0 0 10px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Your message</p>
                      <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;">{escapedMessage}</p>
                    </div>

                    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
                      In the meantime, check our FAQ page for quick answers to common questions.
                    </p>

                    <div style="text-align:center;margin:0 0 24px;">
                      <a href="{faqUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;font-weight:600;">
                        Browse FAQ
                      </a>
                    </div>

                    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                      If your issue is urgent, you can also reach us directly at <a href="mailto:{supportEmail}" style="color:#7c3aed;">{supportEmail}</a>.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
                    <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 AiMedia. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;
    }

    private static string BuildVerificationEmail(string fullName, string verifyUrl, string logoUrl) => $"""
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
                            <img src="{logoUrl}" width="44" height="44" alt="AiMedia" style="display:block;border-radius:10px;" />
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
                        Thanks for signing up! Click the button below to verify your email address and activate your account with <strong>50 free credits</strong>.
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
