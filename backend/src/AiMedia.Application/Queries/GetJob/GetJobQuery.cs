using AiMedia.Application.DTOs;
using MediatR;

namespace AiMedia.Application.Queries.GetJob;

public record GetJobQuery(Guid JobId, Guid UserId) : IRequest<JobDto?>;
