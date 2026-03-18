namespace AiMedia.Domain.Entities;

public class CreditPack
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Credits { get; set; }
    public decimal PriceUsd { get; set; }
    public bool IsActive { get; set; } = true;
}
