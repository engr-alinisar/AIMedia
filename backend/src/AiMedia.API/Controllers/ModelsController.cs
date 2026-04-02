using AiMedia.Application.Common;
using AiMedia.Application.Interfaces;
using AiMedia.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AiMedia.API.Controllers;

public record ModelDto(string Id, string Name, string Description, int CreditsBase, int CreditsPerSecond, string Tier);

[Authorize]
[ApiController]
[Route("api/models")]
public class ModelsController(IModelPricingService pricingService) : ControllerBase
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

    [AllowAnonymous]
    [HttpGet("catalog")]
    public async Task<IActionResult> GetCatalog([FromQuery] string? product, CancellationToken ct)
    {
        ProductType? productType = null;
        if (!string.IsNullOrWhiteSpace(product))
        {
            if (!Enum.TryParse<ProductType>(product, true, out var parsed))
                return BadRequest(new { error = $"Unknown product: {product}" });

            productType = parsed;
        }

        var models = await pricingService.GetCatalogAsync(productType, ct);
        return Ok(models);
    }
}
