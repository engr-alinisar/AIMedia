namespace AiMedia.Application.DTOs;

public record ExploreItemDto(
    Guid Id,
    string Product,
    string? OutputUrl,
    string? Prompt,
    string? ModelId,
    DateTime CreatedAt,
    string? UserDisplayName,
    string? Zone,
    string? Title,
    List<string>? MultiPrompts = null,
    string? InputImageUrl = null,
    List<ExploreElementDto>? InputElements = null,
    Guid? OwnerId = null,
    bool IsPublic = true
);

public record ExploreElementDto(
    string? FrontalImageUrl,
    List<string>? ReferenceImageUrls
);
