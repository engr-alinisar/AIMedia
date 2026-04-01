using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace AiMedia.Application.Commands.Auth;

public class LoginCommandHandler(IAppDbContext db, IJwtService jwtService, IConfiguration config) : IRequestHandler<LoginCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email.ToLower(), cancellationToken);

        // Use a constant-time BCrypt verify even for non-existent users to prevent
        // timing-based account enumeration. The dummy hash is never valid.
        const string DummyHash = "$2a$11$invalidhashvaluethatwillnevermatchwithanypasswordhash..";
        var hashToVerify = (user == null || user.IsDeleted) ? DummyHash : user.PasswordHash;
        var passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, hashToVerify);

        if (user == null || user.IsDeleted || !passwordValid)
            throw new UnauthorizedAccessException("Invalid email or password.");

        var skipEmailVerification = bool.TryParse(config["SkipEmailVerification"], out var skip) && skip;
        if (!user.IsEmailVerified && !skipEmailVerification)
            throw new UnauthorizedAccessException("EMAIL_NOT_VERIFIED");

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
