using AiMedia.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiMedia.Infrastructure.Persistence.Configurations;

public class GenerationJobConfiguration : IEntityTypeConfiguration<GenerationJob>
{
    public void Configure(EntityTypeBuilder<GenerationJob> builder)
    {
        builder.HasKey(j => j.Id);
        builder.Property(j => j.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(j => j.FalRequestId).IsRequired().HasMaxLength(256);
        builder.Property(j => j.FalEndpoint).IsRequired().HasMaxLength(256);

        // JSONB columns
        builder.Property(j => j.FalInput).HasColumnType("jsonb");
        builder.Property(j => j.FalOutput).HasColumnType("jsonb");

        // Unique index on FalRequestId — used for webhook lookup
        builder.HasIndex(j => j.FalRequestId).IsUnique();

        // Composite index for user job history
        builder.HasIndex(j => new { j.UserId, j.CreatedAt });
    }
}
