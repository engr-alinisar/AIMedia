using System.Text.RegularExpressions;
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

        ValidatePassword(request.NewPassword);

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Password changed for user {UserId}", request.UserId);

        return Unit.Value;
    }

    private static void ValidatePassword(string password)
    {
        if (password.Length < 8)
            throw new ArgumentException("Password must be at least 8 characters.");
        if (!Regex.IsMatch(password, "[A-Z]"))
            throw new ArgumentException("Password must contain at least one uppercase letter.");
        if (!Regex.IsMatch(password, "[a-z]"))
            throw new ArgumentException("Password must contain at least one lowercase letter.");
        if (!Regex.IsMatch(password, "[0-9]"))
            throw new ArgumentException("Password must contain at least one digit.");
        if (!Regex.IsMatch(password, "[^A-Za-z0-9]"))
            throw new ArgumentException("Password must contain at least one special character.");
    }
}
