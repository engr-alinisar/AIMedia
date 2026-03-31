using System.Security.Claims;
using AiMedia.Application.Queries.Explore;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AiMedia.API.Controllers;

[ApiController]
[Route("api/explore")]
public class ExploreController : ControllerBase
{
    private readonly IMediator _mediator;

    public ExploreController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetExplore(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? zone = null,
        [FromQuery] bool myJobsOnly = false,
        CancellationToken ct = default)
    {
        Guid? userId = null;
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (sub is not null && Guid.TryParse(sub, out var parsed))
            userId = parsed;

        var result = await _mediator.Send(new GetExploreQuery(page, pageSize, zone, userId, myJobsOnly), ct);
        return Ok(result);
    }
}
