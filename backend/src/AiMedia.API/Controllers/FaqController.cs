using AiMedia.Application.Queries.Faq;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace AiMedia.API.Controllers;

[ApiController]
[Route("api/faq")]
public class FaqController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetFaq(CancellationToken ct)
    {
        var items = await mediator.Send(new GetFaqQuery(), ct);
        return Ok(items);
    }
}
