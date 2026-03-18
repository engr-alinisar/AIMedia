using AiMedia.Domain.Enums;

namespace AiMedia.Application.DTOs;

public class CreditTransactionDto
{
    public Guid Id { get; set; }
    public TransactionType Type { get; set; }
    public int Amount { get; set; }
    public int BalanceAfter { get; set; }
    public string Description { get; set; } = string.Empty;
    public Guid? JobId { get; set; }
    public DateTime CreatedAt { get; set; }
}
