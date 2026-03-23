using AiMedia.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AiMedia.Application.Commands.Auth;

public class DeleteAccountCommandHandler(IAppDbContext db, ILogger<DeleteAccountCommandHandler> logger)
    : IRequestHandler<DeleteAccountCommand, Unit>
{
    public async Task<Unit> Handle(DeleteAccountCommand request, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Password is incorrect.");

        user.IsDeleted = true;
        user.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Account soft-deleted for user {UserId}", request.UserId);

        return Unit.Value;
    }
}
