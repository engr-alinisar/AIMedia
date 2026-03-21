using System.Text;
using System.Text.Json;
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
    ILogger<WebhooksController> logger) : ControllerBase
{
    [HttpPost("fal")]
    public async Task<IActionResult> FalWebhook(CancellationToken ct)
    {
        Request.EnableBuffering();
        var rawBody = await new StreamReader(Request.Body, Encoding.UTF8).ReadToEndAsync(ct);

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
            new ProcessWebhookCommand(requestId, status, outputUrl, errorMessage, rawBody, outputText),
            CancellationToken.None));

        logger.LogInformation("Fal webhook enqueued for RequestId {RequestId}", payload.RequestId);
        return new EmptyResult();
    }
}
