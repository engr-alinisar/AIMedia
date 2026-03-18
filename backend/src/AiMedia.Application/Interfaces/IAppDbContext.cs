using AiMedia.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Application.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<GenerationJob> GenerationJobs { get; }
    DbSet<CreditTransaction> CreditTransactions { get; }
    DbSet<VoiceClone> VoiceClones { get; }
    DbSet<CreditPack> CreditPacks { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
