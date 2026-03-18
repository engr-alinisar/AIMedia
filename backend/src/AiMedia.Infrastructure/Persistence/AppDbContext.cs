using AiMedia.Application.Interfaces;
using AiMedia.Domain.Entities;
using AiMedia.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace AiMedia.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<GenerationJob> GenerationJobs => Set<GenerationJob>();
    public DbSet<CreditTransaction> CreditTransactions => Set<CreditTransaction>();
    public DbSet<VoiceClone> VoiceClones => Set<VoiceClone>();
    public DbSet<CreditPack> CreditPacks => Set<CreditPack>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Register PostgreSQL enums
        modelBuilder.HasPostgresEnum<ProductType>();
        modelBuilder.HasPostgresEnum<ModelTier>();
        modelBuilder.HasPostgresEnum<JobStatus>();
        modelBuilder.HasPostgresEnum<SubscriptionPlan>();
        modelBuilder.HasPostgresEnum<TransactionType>();

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
