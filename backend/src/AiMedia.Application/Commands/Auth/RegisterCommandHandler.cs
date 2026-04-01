using System.Security.Cryptography;
using System.Text.RegularExpressions;
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
        ValidatePassword(request.Password);

        var emailLower = request.Email.ToLower();

        // Check active accounts
        var activeExists = await db.Users.AnyAsync(u => u.Email == emailLower && !u.IsDeleted, cancellationToken);
        if (activeExists)
            throw new InvalidOperationException("An account with this email already exists.");

        // Check if this email was ever used (including deleted accounts) — no free credits if so
        var everUsed = await db.Users.AnyAsync(u => u.Email == emailLower, cancellationToken);
        var startingCredits = everUsed ? 0 : 50;

        // Generate secure verification token
        var tokenBytes = RandomNumberGenerator.GetBytes(32);
        var verificationToken = Convert.ToBase64String(tokenBytes)
            .Replace("+", "-").Replace("/", "_").Replace("=", "");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = emailLower,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            CreditBalance = startingCredits,
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
