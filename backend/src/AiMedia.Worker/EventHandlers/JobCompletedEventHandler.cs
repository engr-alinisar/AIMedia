using AiMedia.Application.Interfaces;
using AiMedia.Domain.Enums;
using AiMedia.Domain.Events;
using AiMedia.Worker.Hubs;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace AiMedia.Worker.EventHandlers;

public class JobCompletedEventHandler(
    IHubContext<GenerationHub, IGenerationHubClient> hubContext,
    IStorageService storage,
    ILogger<JobCompletedEventHandler> logger) : INotificationHandler<JobCompletedEvent>
{
    public async Task Handle(JobCompletedEvent notification, CancellationToken cancellationToken)
    {
        string? outputUrl = null;
        if (notification.OutputR2Key is not null)
        {
            try { outputUrl = storage.GetPublicUrl(notification.OutputR2Key); }
            catch (Exception ex) { logger.LogWarning(ex, "Failed to build public URL for job {JobId}", notification.JobId); }
        }

        await hubContext.Clients
            .Group($"user-{notification.UserId}")
            .JobUpdate(new JobStatusUpdate
            {
                JobId = notification.JobId,
                Status = JobStatus.Completed,
                OutputUrl = outputUrl,
                CreditsCharged = notification.CreditsCharged
            });

        logger.LogInformation("SignalR JobUpdate sent for completed job {JobId}", notification.JobId);
    }
}
