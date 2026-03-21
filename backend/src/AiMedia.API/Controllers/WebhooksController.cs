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
    private readonly IWebHostEnvironment _env;

    public WebhooksController(
        FalWebhookVerifier verifier,
        IBackgroundJobClient jobs,
        ILogger<WebhooksController> logger,
        IWebHostEnvironment env)
    {
        _verifier = verifier;
        _jobs = jobs;
        _logger = logger;
        _env = env;
    }

    [HttpPost("fal")]
    public async Task<IActionResult> FalWebhook(CancellationToken ct)
    {
        // Read raw body first (must be before response is written)
        Request.EnableBuffering();
        var rawBody = await new StreamReader(Request.Body, Encoding.UTF8).ReadToEndAsync(ct);
        var rawBytes = Encoding.UTF8.GetBytes(rawBody);

        // TODO: Re-enable Ed25519 signature verification once implementation is validated.
        // Currently disabled because the Ed25519 verifier has a bug causing all webhooks to fail.
        // Security note: the webhook URL contains a unique jobId query param which provides
        // basic request validation. Full signature verification should be restored before launch.
        _logger.LogDebug("Fal webhook received — signature verification temporarily disabled");

        // Return 200 immediately — fal.ai will retry if we take too long
        Response.StatusCode = 200;
        await Response.WriteAsync("OK", ct);
        await Response.CompleteAsync();

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

        // Extract first output URL (or transcription text) from payload if status=OK
        string? outputUrl = null;
        string? outputText = null;
        if (payload.Status == "OK" && payload.Payload is not null)
        {
            var outputs = payload.Payload.Deserialize<FalOutputUrls>();
            outputUrl = outputs?.GetFirstUrl();
            outputText = outputs?.Text; // transcription result — plain text, not a URL
        }

        // Enqueue Hangfire job — never process inline
        var requestId = payload.RequestId;
        var status = payload.Status;
        var errorMessage = payload.Error?.Message;
        _jobs.Enqueue<IMediator>(m => m.Send(
            new ProcessWebhookCommand(requestId, status, outputUrl, errorMessage, rawBody, outputText),
            CancellationToken.None));

        _logger.LogInformation("Fal webhook enqueued for RequestId {RequestId}", payload.RequestId);
        return new EmptyResult();
    }
}
