using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Queries.GetJobs;

public record GetJobsQuery(Guid UserId, int Page = 1, int PageSize = 20) : IRequest<PagedResult<JobDto>>;
