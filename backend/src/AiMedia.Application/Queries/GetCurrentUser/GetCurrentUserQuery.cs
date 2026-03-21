using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Queries.GetCurrentUser;

public record GetCurrentUserQuery(Guid UserId) : IRequest<UserDto>;
