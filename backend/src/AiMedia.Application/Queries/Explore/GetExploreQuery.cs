using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Queries.Explore;

public record GetExploreQuery(int Page, int PageSize, string? Zone) : IRequest<PagedResult<ExploreItemDto>>;
