using AiMedia.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Application.Commands.SetJobVisibility;

public class SetJobVisibilityCommandHandler(IAppDbContext db)
    : IRequestHandler<SetJobVisibilityCommand>
{
    public async Task Handle(SetJobVisibilityCommand request, CancellationToken cancellationToken)
    {
        var job = await db.GenerationJobs
            .FirstOrDefaultAsync(j => j.Id == request.JobId && j.UserId == request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("Job not found or access denied.");

        job.IsPublic = request.IsPublic;
        await db.SaveChangesAsync(cancellationToken);
    }
}
