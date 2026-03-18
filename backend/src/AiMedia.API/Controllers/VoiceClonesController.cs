using System.Security.Claims;
using AiMedia.Application.Queries.GetVoiceClones;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AiMedia.API.Controllers;

[Authorize]
[ApiController]
[Route("api/voice-clones")]
public class VoiceClonesController : ControllerBase
{
    private readonly IMediator _mediator;

    public VoiceClonesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var clones = await _mediator.Send(new GetVoiceClonesQuery(GetUserId()), ct);
        return Ok(clones);
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value
               ?? throw new UnauthorizedAccessException("Invalid token.");
        return Guid.Parse(sub);
    }
}
