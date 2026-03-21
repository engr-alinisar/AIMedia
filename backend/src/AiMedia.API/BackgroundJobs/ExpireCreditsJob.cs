using AiMedia.Application.Interfaces;
using AiMedia.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.API.BackgroundJobs;

/// <summary>
/// Daily job: releases any credits reserved for over 24 hours
/// (safety net for jobs that never received a webhook and were missed by PollStuckJobs).
/// </summary>
public class ExpireCreditsJob(
    IAppDbContext db,
    ICreditService creditService,
    ILogger<ExpireCreditsJob> logger)
{
    public async Task ExecuteAsync(CancellationToken ct = default)
    {
        var cutoff = DateTime.UtcNow.AddHours(-24);

        var expiredJobs = await db.GenerationJobs
            .Where(j => (j.Status == JobStatus.Queued || j.Status == JobStatus.Processing)
                        && j.CreditsReserved > 0
                        && j.CreatedAt < cutoff)
            .ToListAsync(ct);

        if (expiredJobs.Count == 0) return;

        logger.LogWarning("ExpireCredits: expiring {Count} abandoned job(s)", expiredJobs.Count);

        foreach (var job in expiredJobs)
        {
            try
            {
                job.Status = JobStatus.Failed;
                job.ErrorMessage = "Job expired — no response received within 24 hours.";
                job.CompletedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(ct);

                await creditService.ReleaseAsync(
                    job.UserId, job.Id, job.CreditsReserved,
                    "Job expired — credits released", ct);

                logger.LogInformation("ExpireCredits: expired job {JobId}, released {Credits} credits",
                    job.Id, job.CreditsReserved);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "ExpireCredits: error expiring job {JobId}", job.Id);
            }
        }
    }
}
