namespace AiMedia.Application.DTOs;

public record GenerationResponse(
    Guid JobId,
    int CreditsReserved,
    int EstimatedSeconds);
