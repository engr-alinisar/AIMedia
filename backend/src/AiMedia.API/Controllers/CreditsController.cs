using System.Security.Claims;
using AiMedia.Application.Queries.GetCreditBalance;
using AiMedia.Application.Queries.GetCreditTransactions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AiMedia.API.Controllers;

[Authorize]
[ApiController]
[Route("api/credits")]
public class CreditsController : ControllerBase
{
    private readonly IMediator _mediator;

    public CreditsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("balance")]
    public async Task<IActionResult> GetBalance(CancellationToken ct)
    {
        var balance = await _mediator.Send(new GetCreditBalanceQuery(GetUserId()), ct);
        return Ok(balance);
    }

    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var transactions = await _mediator.Send(
            new GetCreditTransactionsQuery(GetUserId(), page, pageSize), ct);
        return Ok(transactions);
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value
               ?? throw new UnauthorizedAccessException("Invalid token.");
        return Guid.Parse(sub);
    }
}
