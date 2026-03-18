using AiMedia.Application.Commands.ProcessWebhook;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AiMedia.Worker.Jobs;

/// <summary>
/// Safety net: polls fal.ai for any jobs stuck in Queued/Processing for over 10 minutes.
/// Runs every 5 minutes via Hangfire recurring job.
/// </summary>
public class PollStuckJobsJob(
    IAppDbContext db,
    IFalClient falClient,
    IMediator mediator,
    ILogger<PollStuckJobsJob> logger)
{
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow.AddMinutes(-10);

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
                var status = await falClient.GetJobStatusAsync($"{job.FalEndpoint}/{job.FalRequestId}", ct);

                if (status.Status is "COMPLETED" or "FAILED")
                {
                    string? outputUrl = null;
                    string? errorMessage = null;
                    string falStatus;

                    if (status.Status == "COMPLETED")
                    {
                        falStatus = "OK";
                        outputUrl = await falClient.GetResultUrlAsync(job.FalEndpoint, job.FalRequestId, ct);
                    }
                    else
                    {
                        falStatus = "ERROR";
                        errorMessage = "Job failed on fal.ai (detected by poll)";
                    }

                    await mediator.Send(
                        new ProcessWebhookCommand(job.FalRequestId, falStatus, outputUrl, errorMessage, null), ct);

                    logger.LogInformation(
                        "PollStuckJobs: processed job {JobId} with status {Status}",
                        job.Id, status.Status);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "PollStuckJobs: error polling job {JobId}", job.Id);
            }
        }
    }
}
