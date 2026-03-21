using AiMedia.Application.DTOs;
using AiMedia.Application.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Application.Queries.GetCurrentUser;

public class GetCurrentUserQueryHandler(IAppDbContext db) : IRequestHandler<GetCurrentUserQuery, UserDto>
{
    public async Task<UserDto> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new UnauthorizedAccessException("User not found.");

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
