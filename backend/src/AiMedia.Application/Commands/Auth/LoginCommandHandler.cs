using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Application.Commands.Auth;

public class LoginCommandHandler(IAppDbContext db, IJwtService jwtService) : IRequestHandler<LoginCommand, AuthResponse>
{
    public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email.ToLower(), cancellationToken);

        if (user == null)
            throw new UnauthorizedAccessException("No account found with this email. Please register first.");

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Incorrect password. Please try again.");

        if (!user.IsEmailVerified)
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
