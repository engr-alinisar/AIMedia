using System.Security.Claims;
using AiMedia.Application.Commands.Payments;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AiMedia.API.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController(IMediator mediator) : ControllerBase
{
    /// <summary>
    /// Creates a PayPal order and returns the approval URL to redirect the user to.
    /// </summary>
    [Authorize]
    [HttpPost("paypal/create-order")]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request, CancellationToken ct)
    {
        var approvalUrl = await mediator.Send(new CreatePayPalOrderCommand(GetUserId(), request.PackId), ct);
        return Ok(new { approvalUrl });
    }

    /// <summary>
    /// Captures a PayPal order after user approves. Called by frontend on return from PayPal.
    /// </summary>
    [Authorize]
    [HttpPost("paypal/capture/{orderId}")]
    public async Task<IActionResult> CaptureOrder(string orderId, CancellationToken ct)
    {
        var success = await mediator.Send(new CapturePayPalOrderCommand(orderId), ct);
        if (!success)
            return BadRequest(new { message = "Payment capture failed. Please contact support." });

        return Ok(new { success = true, message = "Payment successful! Credits added to your account." });
    }

    private Guid GetUserId()
    {
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value
               ?? throw new UnauthorizedAccessException("Invalid token.");
        return Guid.Parse(sub);
    }
}

public record CreateOrderRequest(string PackId);
