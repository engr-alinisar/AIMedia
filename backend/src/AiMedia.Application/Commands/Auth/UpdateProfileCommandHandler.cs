using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AiMedia.Application.Commands.Auth;

public class UpdateProfileCommandHandler(IAppDbContext db, ILogger<UpdateProfileCommandHandler> logger)
    : IRequestHandler<UpdateProfileCommand, UserDto>
{
    public async Task<UserDto> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new InvalidOperationException("User not found.");

        user.FullName = request.DisplayName?.Trim();

        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Profile updated for user {UserId}", request.UserId);

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            CreditBalance = user.CreditBalance,
            ReservedCredits = user.ReservedCredits,
            Plan = user.Plan,
            CreatedAt = user.CreatedAt,
            IsEmailVerified = user.IsEmailVerified
        };
    }
}
