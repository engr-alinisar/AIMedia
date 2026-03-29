using AiMedia.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiMedia.Infrastructure.Persistence.Configurations;

public class ModelPricingConfiguration : IEntityTypeConfiguration<ModelPricing>
{
    public void Configure(EntityTypeBuilder<ModelPricing> builder)
    {
        builder.HasKey(x => x.ModelId);
        builder.Property(x => x.ModelId).HasMaxLength(200);
        builder.Property(x => x.UpdatedAt).HasDefaultValueSql("now()");
    }
}
