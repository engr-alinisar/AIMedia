using AiMedia.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AiMedia.Application.Commands.Auth;

public class ChangePasswordCommandHandler(IAppDbContext db, ILogger<ChangePasswordCommandHandler> logger)
    : IRequestHandler<ChangePasswordCommand, Unit>
{
    public async Task<Unit> Handle(ChangePasswordCommand request, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedAccessException("Current password is incorrect.");

        if (request.NewPassword.Length < 8)
            throw new InvalidOperationException("New password must be at least 8 characters.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Password changed for user {UserId}", request.UserId);

        return Unit.Value;
    }
}
