using System.Text;
using System.Text.Json;
using AiMedia.Application.Common;
using AiMedia.Application.Commands.Payments;
using AiMedia.Application.Commands.ProcessWebhook;
using AiMedia.FalAi.Models;
using Hangfire;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AiMedia.API.Controllers;

[ApiController]
[Route("api/webhooks")]
public class WebhooksController(
    IBackgroundJobClient jobs,
    IConfiguration config,
    ILogger<WebhooksController> logger) : ControllerBase
{
    [HttpPost("paypal")]
    public async Task<IActionResult> PayPalWebhook(CancellationToken ct)
    {
        Request.EnableBuffering();
        var rawBody = await new StreamReader(Request.Body, Encoding.UTF8).ReadToEndAsync(ct);

        var webhookId = config["PayPal:WebhookId"] ?? string.Empty;
        var transmissionId = Request.Headers["PAYPAL-TRANSMISSION-ID"].ToString();
        var transmissionTime = Request.Headers["PAYPAL-TRANSMISSION-TIME"].ToString();
        var certUrl = Request.Headers["PAYPAL-CERT-URL"].ToString();
        var authAlgo = Request.Headers["PAYPAL-AUTH-ALGO"].ToString();
        var transmissionSig = Request.Headers["PAYPAL-TRANSMISSION-SIG"].ToString();

        jobs.Enqueue<IMediator>(m => m.Send(
            new ProcessPayPalWebhookCommand(webhookId, transmissionId, transmissionTime, certUrl, authAlgo, transmissionSig, rawBody),
            CancellationToken.None));

        logger.LogInformation("PayPal webhook enqueued, event from {TransmissionId}", transmissionId);
        return Ok();
    }


    [HttpPost("fal")]
    public async Task<IActionResult> FalWebhook(CancellationToken ct)
    {
        var jobIdRaw = Request.Query["jobId"].ToString();
        var token = Request.Query["token"].ToString();
        logger.LogInformation(
            "Received fal webhook request for jobId {JobId}. Token present: {HasToken}. Remote IP: {RemoteIp}",
            jobIdRaw,
            !string.IsNullOrWhiteSpace(token),
            HttpContext.Connection.RemoteIpAddress?.ToString());
        var webhookSecret = config["FalAi:WebhookSecret"]
            ?? config["FAL_WEBHOOK_SECRET"];

        if (!Guid.TryParse(jobIdRaw, out var jobId) ||
            string.IsNullOrWhiteSpace(webhookSecret) ||
            !FalWebhookSecurity.IsValid(jobId, token, webhookSecret))
        {
            logger.LogWarning("Rejected fal webhook with invalid signature for jobId {JobId}", jobIdRaw);
            return Unauthorized();
        }

        Request.EnableBuffering();
        var rawBody = await new StreamReader(Request.Body, Encoding.UTF8).ReadToEndAsync(ct);
        logger.LogInformation("Accepted fal webhook for job {JobId}. Payload length: {PayloadLength}", jobId, rawBody.Length);

        // Return 200 immediately — fal.ai will retry if we take too long
        Response.StatusCode = 200;
        await Response.WriteAsync("OK", ct);
        await Response.CompleteAsync();

        FalWebhookPayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<FalWebhookPayload>(rawBody);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to deserialize fal webhook payload");
            return new EmptyResult();
        }

        if (payload is null)
        {
            logger.LogWarning("Fal webhook payload was null after deserialization");
            return new EmptyResult();
        }

        string? outputUrl = null;
        string? outputText = null;
        if (payload.Status == "OK" && payload.Payload is not null)
        {
            var outputs = payload.Payload.Deserialize<FalOutputUrls>();
            outputUrl = outputs?.GetFirstUrl();
            outputText = outputs?.Text;
        }

        var requestId = payload.RequestId;
        var status = payload.Status;
        var errorMessage = payload.Error?.Message;
        jobs.Enqueue<IMediator>(m => m.Send(
            new ProcessWebhookCommand(jobId, requestId, status, outputUrl, errorMessage, rawBody, outputText),
            CancellationToken.None));

        logger.LogInformation("Fal webhook enqueued for job {JobId} and RequestId {RequestId}", jobId, payload.RequestId);
        return new EmptyResult();
    }
}
