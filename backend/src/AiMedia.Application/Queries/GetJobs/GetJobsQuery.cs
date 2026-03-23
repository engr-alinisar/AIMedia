using AiMedia.Application.DTOs;
using AiMedia.Domain.Enums;
using MediatR;

namespace AiMedia.Application.Queries.GetJobs;

public record GetJobsQuery(
    Guid UserId,
    int Page = 1,
    int PageSize = 20,
    ProductType? Product = null,
    JobStatus? Status = null,
    DateTime? From = null,
    DateTime? To = null
) : IRequest<PagedResult<JobDto>>;
