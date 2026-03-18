using AiMedia.Application.Common;
using AiMedia.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AiMedia.API.Controllers;

public record ModelDto(string Id, string Name, string Description, int CreditsBase, int CreditsPerSecond, string Tier);

[Authorize]
[ApiController]
[Route("api/models")]
public class ModelsController : ControllerBase
{
    [HttpGet]
    public IActionResult GetModels([FromQuery] string product)
    {
        if (!Enum.TryParse<ProductType>(product, true, out var productType))
            return BadRequest(new { error = $"Unknown product: {product}" });

        var models = ModelRegistry.ForProduct(productType)
            .Select(m => new ModelDto(m.Id, m.Name, m.Description, m.CreditsBase, m.CreditsPerSecond, m.Tier.ToString()))
            .ToList();

        return Ok(models);
    }
}
