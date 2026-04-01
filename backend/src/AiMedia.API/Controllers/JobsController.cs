using System.Security.Claims;
using AiMedia.Application.Commands.SetJobVisibility;
using AiMedia.Application.Commands.SetJobZone;
using AiMedia.Application.Queries.GetJob;
using AiMedia.Application.Queries.GetJobs;
using AiMedia.Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AiMedia.API.Controllers;

public record SetVisibilityRequest(bool IsPublic);
public record SetZoneRequest(string? Zone);

[Authorize]
[ApiController]
[Route("api/jobs")]
public class JobsController : ControllerBase
{
    private readonly IMediator _mediator;

    public JobsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetJobs(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] ProductType? product = null,
        [FromQuery] JobStatus? status = null,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        CancellationToken ct = default)
    {
        var result = await _mediator.Send(
            new GetJobsQuery(GetUserId(), page, pageSize, product, status, from, to), ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetJob(Guid id, CancellationToken ct)
    {
        var job = await _mediator.Send(new GetJobQuery(id, GetUserId()), ct);
        if (job is null) return NotFound();
        return Ok(job);
    }

    [HttpPatch("{id:guid}/visibility")]
    public async Task<IActionResult> SetVisibility(Guid id, [FromBody] SetVisibilityRequest request, CancellationToken ct)
    {
        await _mediator.Send(new SetJobVisibilityCommand(id, GetUserId(), request.IsPublic), ct);
        return NoContent();
    }

    [HttpPatch("{id:guid}/zone")]
    public async Task<IActionResult> SetZone(Guid id, [FromBody] SetZoneRequest request, CancellationToken ct)
    {
        await _mediator.Send(new SetJobZoneCommand(id, GetUserId(), request.Zone), ct);
        return NoContent();
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value
               ?? throw new UnauthorizedAccessException("Invalid token.");
        return Guid.Parse(sub);
    }
}
