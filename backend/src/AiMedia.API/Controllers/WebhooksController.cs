using System.Text;
using System.Text.Json;
using AiMedia.Application.Commands.ProcessWebhook;
using AiMedia.FalAi;
using AiMedia.FalAi.Models;
using Hangfire;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AiMedia.API.Controllers;

[ApiController]
[Route("api/webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly FalWebhookVerifier _verifier;
    private readonly IBackgroundJobClient _jobs;
    private readonly ILogger<WebhooksController> _logger;

    public WebhooksController(
        FalWebhookVerifier verifier,
        IBackgroundJobClient jobs,
        ILogger<WebhooksController> logger)
    {
        _verifier = verifier;
        _jobs = jobs;
        _logger = logger;
    }

    [HttpPost("fal")]
    public async Task<IActionResult> FalWebhook(CancellationToken ct)
    {
        // Return 200 immediately — fal.ai will retry if we take too long
        Response.StatusCode = 200;
        await Response.WriteAsync("OK", ct);
        await Response.CompleteAsync();

        // Read raw body for signature verification
        Request.EnableBuffering();
        Request.Body.Position = 0;
        var rawBody = await new StreamReader(Request.Body, Encoding.UTF8).ReadToEndAsync(ct);
        var rawBytes = Encoding.UTF8.GetBytes(rawBody);

        // Verify Ed25519 signature + anti-replay
        var signature = Request.Headers["x-fal-signature"].ToString();
        var timestamp = Request.Headers["x-fal-timestamp"].ToString();

        if (string.IsNullOrEmpty(signature) || string.IsNullOrEmpty(timestamp))
        {
            _logger.LogWarning("Fal webhook received without signature headers — ignored");
            return new EmptyResult();
        }

        var isValid = await _verifier.VerifyAsync(signature, timestamp, rawBytes, ct);
        if (!isValid)
        {
            _logger.LogWarning("Fal webhook signature verification failed — ignored");
            return new EmptyResult();
        }

        // Parse payload
        FalWebhookPayload? payload;
        try
        {
            payload = JsonSerializer.Deserialize<FalWebhookPayload>(rawBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to deserialize fal webhook payload");
            return new EmptyResult();
        }

        if (payload is null)
        {
            _logger.LogWarning("Fal webhook payload was null after deserialization");
            return new EmptyResult();
        }

        // Extract first output URL from payload if status=OK
        string? outputUrl = null;
        if (payload.Status == "OK" && payload.Payload is not null)
        {
            var outputs = payload.Payload.Deserialize<FalOutputUrls>();
            outputUrl = outputs?.GetFirstUrl();
        }

        // Enqueue Hangfire job — never process inline
        var requestId = payload.RequestId;
        var status = payload.Status;
        var errorMessage = payload.Error?.Message;
        _jobs.Enqueue<IMediator>(m => m.Send(
            new ProcessWebhookCommand(requestId, status, outputUrl, errorMessage, rawBody),
            CancellationToken.None));

        _logger.LogInformation("Fal webhook enqueued for RequestId {RequestId}", payload.RequestId);
        return new EmptyResult();
    }
}
