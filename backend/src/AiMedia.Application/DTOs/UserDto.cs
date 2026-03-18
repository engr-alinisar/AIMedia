using AiMedia.Domain.Enums;

namespace AiMedia.Application.DTOs;

public class UserDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public int CreditBalance { get; set; }
    public int ReservedCredits { get; set; }
    public SubscriptionPlan Plan { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsEmailVerified { get; set; }
}
