using System.Security.Cryptography;
using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Application.Commands.Auth;

public class RegisterCommandHandler(IAppDbContext db, IEmailService emailService)
    : IRequestHandler<RegisterCommand, RegisterResponse>
{
    public async Task<RegisterResponse> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var exists = await db.Users.AnyAsync(u => u.Email == request.Email.ToLower(), cancellationToken);
        if (exists)
            throw new InvalidOperationException("An account with this email already exists.");

        // Generate secure verification token
        var tokenBytes = RandomNumberGenerator.GetBytes(32);
        var verificationToken = Convert.ToBase64String(tokenBytes)
            .Replace("+", "-").Replace("/", "_").Replace("=", "");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = request.Email.ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            CreditBalance = 100,
            CreatedAt = DateTime.UtcNow,
            IsEmailVerified = false,
            EmailVerificationToken = verificationToken,
            EmailVerificationTokenExpiry = DateTime.UtcNow.AddHours(24)
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        await emailService.SendVerificationEmailAsync(user.Email, user.FullName ?? user.Email, verificationToken, cancellationToken);

        return new RegisterResponse(
            "Registration successful! Please check your email to verify your account.",
            MapToDto(user));
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
