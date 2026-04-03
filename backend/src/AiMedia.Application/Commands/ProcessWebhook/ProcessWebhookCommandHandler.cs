using AiMedia.Application.Common;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Enums;
using AiMedia.Domain.Events;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AiMedia.Application.Commands.ProcessWebhook;

public class ProcessWebhookCommandHandler(
    IAppDbContext db,
    IStorageService storage,
    ICreditService creditService,
    IEmailService emailService,
    IPublisher publisher,
    ILogger<ProcessWebhookCommandHandler> logger) : IRequestHandler<ProcessWebhookCommand>
{
    public async Task Handle(ProcessWebhookCommand request, CancellationToken cancellationToken)
    {
        var job = await db.GenerationJobs
            .FirstOrDefaultAsync(j => j.Id == request.JobId && j.FalRequestId == request.FalRequestId, cancellationToken);

        if (job == null) return;

        // Idempotency: skip if already processed
        if (job.Status is JobStatus.Completed or JobStatus.Failed) return;

        var productName = job.Product.ToString();
        var modelName = ModelRegistry.Get(job.FalEndpoint)?.Name ?? job.FalEndpoint;

        if (request.Status == "OK" && (request.OutputUrl != null || request.OutputText != null))
        {
            // Upload output to R2:
            //   - Standard jobs: download the fal.ai file URL → re-upload to R2
            //   - Transcription: save plain text directly to R2 (fal returns text, not a URL)
            string? r2Key = null;
            try
            {
                string filename;
                string contentType;
                Stream fileStream;

                if (request.OutputText != null)
                {
                    filename = "transcription.txt";
                    contentType = "text/plain; charset=utf-8";
                    fileStream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(request.OutputText));
                }
                else
                {
                    var ext = Path.GetExtension(new Uri(request.OutputUrl!).LocalPath).TrimStart('.');
                    if (string.IsNullOrEmpty(ext)) ext = GetDefaultExtension(job.Product);
                    filename = $"output.{ext}";
                    contentType = GetContentType(job.Product);
                    fileStream = await storage.DownloadAsync(request.OutputUrl!, cancellationToken);
                }

                r2Key = storage.BuildKey(job.UserId, job.Id, filename);
                using var stream = fileStream;
                await storage.UploadAsync(stream, r2Key, contentType, cancellationToken);
            }
            catch
            {
                // If R2 upload fails, mark failed and release credits
                job.Status = JobStatus.Failed;
                job.ErrorMessage = "Failed to store output.";
                job.CompletedAt = DateTime.UtcNow;
                await db.SaveChangesAsync(cancellationToken);
                await creditService.ReleaseAsync(job.UserId, job.Id, job.CreditsReserved, $"{job.Product} ({modelName}) — failed (storage error)", cancellationToken);
                await publisher.Publish(new JobFailedEvent(job.Id, job.UserId, job.CreditsReserved, job.ErrorMessage, productName, modelName), cancellationToken);
                return;
            }

            job.Status = JobStatus.Completed;
            job.OutputR2Key = r2Key;
            job.CreditsCharged = job.CreditsReserved;
            job.CompletedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);

            await creditService.DeductAsync(job.UserId, job.Id, job.CreditsReserved, $"{job.Product} ({modelName}) — completed", cancellationToken);
            await publisher.Publish(new JobCompletedEvent(job.Id, job.UserId, r2Key, job.CreditsCharged, productName, modelName), cancellationToken);

            // Low credit warning — send once when balance drops below 50 (reset when user tops up)
            var (balance, _) = await creditService.GetBalanceAsync(job.UserId, cancellationToken);
            if (balance < 50)
            {
                var user = await db.Users.FindAsync([job.UserId], cancellationToken);
                if (user is not null && user.LowCreditEmailSentAt is null)
                {
                    try
                    {
                        await emailService.SendLowCreditsEmailAsync(user.Email, user.FullName ?? "there", balance, cancellationToken);
                        user.LowCreditEmailSentAt = DateTime.UtcNow;
                        await db.SaveChangesAsync(cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Failed to send low credits email to {Email}", user.Email);
                    }
                }
            }
        }
        else
        {
            job.Status = JobStatus.Failed;
            job.ErrorMessage = request.ErrorMessage ?? "Generation failed.";
            job.CompletedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);

            await creditService.ReleaseAsync(job.UserId, job.Id, job.CreditsReserved, $"{job.Product} ({modelName}) — failed (refunded)", cancellationToken);
            await publisher.Publish(new JobFailedEvent(job.Id, job.UserId, job.CreditsReserved, job.ErrorMessage, productName, modelName), cancellationToken);
        }
    }

    private static string GetDefaultExtension(Domain.Enums.ProductType product) => product switch
    {
        Domain.Enums.ProductType.ImageGen            => "png",
        Domain.Enums.ProductType.BackgroundRemoval   => "png",
        Domain.Enums.ProductType.ImageToVideo        => "mp4",
        Domain.Enums.ProductType.MotionControl       => "mp4",
        Domain.Enums.ProductType.TextToVideo         => "mp4",
        Domain.Enums.ProductType.Voice               => "mp3",
        Domain.Enums.ProductType.Transcription       => "txt",
        _ => "bin"
    };

    private static string GetContentType(Domain.Enums.ProductType product) => product switch
    {
        Domain.Enums.ProductType.ImageGen            => "image/png",
        Domain.Enums.ProductType.BackgroundRemoval   => "image/png",
        Domain.Enums.ProductType.ImageToVideo        => "video/mp4",
        Domain.Enums.ProductType.MotionControl       => "video/mp4",
        Domain.Enums.ProductType.TextToVideo         => "video/mp4",
        Domain.Enums.ProductType.Voice               => "audio/mpeg",
        Domain.Enums.ProductType.Transcription       => "text/plain",
        _ => "application/octet-stream"
    };
}
