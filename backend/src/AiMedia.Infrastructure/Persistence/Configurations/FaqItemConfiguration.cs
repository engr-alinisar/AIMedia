using AiMedia.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiMedia.Infrastructure.Persistence.Configurations;

public class FaqItemConfiguration : IEntityTypeConfiguration<FaqItem>
{
    public void Configure(EntityTypeBuilder<FaqItem> builder)
    {
        builder.HasKey(f => f.Id);
        builder.ToTable("faq_items");

        builder.Property(f => f.Question).IsRequired().HasMaxLength(500);
        builder.Property(f => f.Answer).IsRequired().HasMaxLength(2000);
        builder.Property(f => f.Category).IsRequired().HasMaxLength(100);
        builder.Property(f => f.IsActive).IsRequired();
        builder.Property(f => f.Order).IsRequired();
        builder.Property(f => f.CreatedAt).IsRequired();

        builder.HasIndex(f => new { f.Category, f.Order });
    }
}
