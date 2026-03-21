using AiMedia.Application.Commands.ProcessWebhook;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace AiMedia.API.BackgroundJobs;

/// <summary>
/// Safety net: polls fal.ai for any jobs stuck in Queued/Processing for over 10 minutes.
/// Runs every 5 minutes via Hangfire recurring job.
/// </summary>
public class PollStuckJobsJob(
    IAppDbContext db,
    IFalClient falClient,
    IMediator mediator,
    ILogger<PollStuckJobsJob> logger,
    IConfiguration config)
{
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var stuckMinutes = config.GetValue<int>("Hangfire:StuckJobMinutes", 10);
        var cutoff = DateTime.UtcNow.AddMinutes(-stuckMinutes);

        var stuckJobs = await db.GenerationJobs
            .Where(j => (j.Status == JobStatus.Queued || j.Status == JobStatus.Processing)
                        && j.CreatedAt < cutoff)
            .ToListAsync(ct);

        if (stuckJobs.Count == 0) return;

        logger.LogInformation("PollStuckJobs: found {Count} stuck job(s)", stuckJobs.Count);

        foreach (var job in stuckJobs)
        {
            try
            {
                if (string.IsNullOrEmpty(job.FalStatusUrl))
                {
                    logger.LogWarning("PollStuckJobs: job {JobId} has no FalStatusUrl — marking as failed", job.Id);
                    await mediator.Send(
                        new ProcessWebhookCommand(job.FalRequestId, "ERROR", null, "Job status unavailable — please retry.", null), ct);
                    continue;
                }

                var status = await falClient.GetJobStatusAsync(job.FalStatusUrl, ct);

                if (status.Status is "COMPLETED" or "FAILED")
                {
                    string? outputUrl = null;
                    string? outputText = null;
                    string? errorMessage = null;
                    string falStatus;

                    if (status.Status == "COMPLETED")
                    {
                        if (!string.IsNullOrEmpty(job.FalResponseUrl))
                        {
                            var result = await falClient.GetResultOutputAsync(job.FalResponseUrl, ct);
                            outputUrl = result?.Url;
                            outputText = result?.Text;
                        }

                        if (outputUrl != null || outputText != null)
                        {
                            falStatus = "OK";
                        }
                        else
                        {
                            falStatus = "ERROR";
                            errorMessage = "Job reported completed but result was unavailable — please retry.";
                            logger.LogWarning("PollStuckJobs: job {JobId} status=COMPLETED but result returned null", job.Id);
                        }

                        await mediator.Send(
                            new ProcessWebhookCommand(job.FalRequestId, falStatus, outputUrl, errorMessage, null, outputText), ct);
                    }
                    else
                    {
                        falStatus = "ERROR";
                        errorMessage = "Job failed on fal.ai (detected by poll)";
                        await mediator.Send(
                            new ProcessWebhookCommand(job.FalRequestId, falStatus, null, errorMessage, null), ct);
                    }

                    logger.LogInformation("PollStuckJobs: processed job {JobId} with status {Status}", job.Id, status.Status);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "PollStuckJobs: error polling job {JobId}", job.Id);
            }
        }
    }
}
