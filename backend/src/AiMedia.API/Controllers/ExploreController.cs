using AiMedia.Application.Queries.Explore;
using MediatR;
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
        CancellationToken ct = default)
    {
        var result = await _mediator.Send(new GetExploreQuery(page, pageSize, zone), ct);
        return Ok(result);
    }
}
