namespace AiMedia.Application.DTOs;

public record FaqItemDto(int Id, string Question, string Answer, string Category, int Order);
