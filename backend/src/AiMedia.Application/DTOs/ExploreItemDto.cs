namespace AiMedia.Application.DTOs;

public record ExploreItemDto(
    Guid Id,
    string Product,
    string? OutputUrl,
    string? Prompt,
    string? ModelId,
    DateTime CreatedAt,
    string? UserDisplayName,
    string? Zone
);
