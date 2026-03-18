using AiMedia.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiMedia.Infrastructure.Persistence.Configurations;

public class VoiceCloneConfiguration : IEntityTypeConfiguration<VoiceClone>
{
    public void Configure(EntityTypeBuilder<VoiceClone> builder)
    {
        builder.HasKey(v => v.Id);
        builder.Property(v => v.Id).HasDefaultValueSql("gen_random_uuid()");
        builder.Property(v => v.Name).IsRequired().HasMaxLength(128);
        builder.Property(v => v.FalVoiceId).IsRequired().HasMaxLength(256);
    }
}
