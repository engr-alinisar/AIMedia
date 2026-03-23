using System.Security.Claims;
using AiMedia.Application.Commands.Contact;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AiMedia.API.Controllers;

[ApiController]
[Route("api/contact")]
public class ContactController : ControllerBase
{
    private readonly IMediator _mediator;

    public ContactController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> SendMessage([FromBody] ContactRequest request, CancellationToken ct)
    {
        // Extract UserId from JWT if present (endpoint is public, so user may or may not be authenticated)
        Guid? userId = null;
        var sub = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value;
        if (sub != null && Guid.TryParse(sub, out var parsedId))
            userId = parsedId;

        await _mediator.Send(
            new SendContactMessageCommand(request.Name, request.Email, request.Subject, request.Message, userId), ct);

        return Ok(new { message = "Your message has been received. We'll get back to you within 24 hours." });
    }
}

public record ContactRequest(string Name, string Email, string Subject, string Message);
