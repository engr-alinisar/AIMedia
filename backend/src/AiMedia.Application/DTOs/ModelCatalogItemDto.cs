namespace AiMedia.Application.DTOs;

public record ModelCatalogItemDto(
    string Id,
    string Name,
    string Description,
    string Product,
    string Tier,
    int CreditsBase,
    int CreditsPerSecond,
    string DisplayPrice
);
