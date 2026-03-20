using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Application.Commands.Auth;

public class VerifyEmailCommandHandler(IAppDbContext db, IJwtService jwtService)
    : IRequestHandler<VerifyEmailCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(VerifyEmailCommand request, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(
            u => u.EmailVerificationToken == request.Token, cancellationToken);

        if (user == null)
            throw new InvalidOperationException("Invalid or expired verification link.");

        if (user.EmailVerificationTokenExpiry < DateTime.UtcNow)
            throw new InvalidOperationException("Verification link has expired. Please register again or request a new link.");

        if (user.IsEmailVerified)
            throw new InvalidOperationException("Email is already verified. Please log in.");

        user.IsEmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationTokenExpiry = null;

        await db.SaveChangesAsync(cancellationToken);

        var token = jwtService.GenerateToken(user);
        return new AuthResponse(token, MapToDto(user));
    }

    private static UserDto MapToDto(User u) => new()
    {
        Id = u.Id,
        Email = u.Email,
        FullName = u.FullName,
        CreditBalance = u.CreditBalance,
        ReservedCredits = u.ReservedCredits,
        Plan = u.Plan,
        CreatedAt = u.CreatedAt,
        IsEmailVerified = u.IsEmailVerified
    };
}
