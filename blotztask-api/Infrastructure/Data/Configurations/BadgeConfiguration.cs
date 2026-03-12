using BlotzTask.Modules.Badges.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class BadgeConfiguration : IEntityTypeConfiguration<Badge>
{
    public void Configure(EntityTypeBuilder<Badge> builder)
    {
        builder.ToTable("Badges");
        builder.HasKey(b => b.Id);
        builder.Property(b => b.Name)
            .IsRequired()
            .HasMaxLength(200);
        builder.Property(b => b.Description)
            .IsRequired()
            .HasMaxLength(1000);
        builder.Property(b => b.IconUrl)
            .IsRequired();
        builder.Property(b => b.Category)
            .HasConversion<string>();
        builder.HasIndex(b => b.Category);
    }
}
