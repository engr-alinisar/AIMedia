using AiMedia.Domain.Enums;
using AiMedia.Domain.Events;
using AiMedia.Worker.Hubs;
using MediatR;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace AiMedia.Worker.EventHandlers;

public class JobFailedEventHandler(
    IHubContext<GenerationHub, IGenerationHubClient> hubContext,
    ILogger<JobFailedEventHandler> logger) : INotificationHandler<JobFailedEvent>
{
    public async Task Handle(JobFailedEvent notification, CancellationToken cancellationToken)
    {
        await hubContext.Clients
            .Group($"user-{notification.UserId}")
            .JobUpdate(new JobStatusUpdate
            {
                JobId = notification.JobId,
                Status = JobStatus.Failed,
                ErrorMessage = notification.ErrorMessage
            });

        logger.LogInformation("SignalR JobUpdate sent for failed job {JobId}", notification.JobId);
    }
}
