using AiMedia.Domain.Enums;

namespace AiMedia.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public int CreditBalance { get; set; }
    public int ReservedCredits { get; set; }
    public SubscriptionPlan Plan { get; set; } = SubscriptionPlan.Free;
    public DateTime? PlanExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsEmailVerified { get; set; }
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationTokenExpiry { get; set; }
    public DateTime? LowCreditEmailSentAt { get; set; }

    public ICollection<GenerationJob> Jobs { get; set; } = [];
    public ICollection<CreditTransaction> Transactions { get; set; } = [];
    public ICollection<VoiceClone> VoiceClones { get; set; } = [];
}
