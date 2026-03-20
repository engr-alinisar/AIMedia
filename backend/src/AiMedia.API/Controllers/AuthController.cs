using System.Security.Claims;
using AiMedia.Application.Commands.Auth;
using AiMedia.Application.Interfaces;
using AiMedia.Application.Queries.GetCreditBalance;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AiMedia.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(
            new RegisterCommand(request.Email, request.Password, request.FullName), ct);
        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new LoginCommand(request.Email, request.Password), ct);
        return Ok(result);
    }

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request, CancellationToken ct)
    {
        var result = await _mediator.Send(new VerifyEmailCommand(request.Token), ct);
        return Ok(result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var userId = GetUserId();
        var balance = await _mediator.Send(new GetCreditBalanceQuery(userId), ct);
        return Ok(balance);
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value
               ?? throw new UnauthorizedAccessException("Invalid token.");
        return Guid.Parse(sub);
    }
}

public record RegisterRequest(string Email, string Password, string? FullName);
public record LoginRequest(string Email, string Password);
public record VerifyEmailRequest(string Token);
