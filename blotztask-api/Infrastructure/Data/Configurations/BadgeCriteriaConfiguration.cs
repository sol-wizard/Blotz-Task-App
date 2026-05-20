using BlotzTask.Modules.Badges.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class BadgeCriteriaConfiguration : IEntityTypeConfiguration<BadgeCriteria>
{
    public void Configure(EntityTypeBuilder<BadgeCriteria> builder)
    {
        builder.ToTable("BadgeCriteria");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.TriggerAction)
            .IsRequired()
            .HasMaxLength(200)
            .HasConversion<string>();
        builder.Property(c => c.ConditionKey)
            .IsRequired()
            .HasMaxLength(200);
        builder.Property(c => c.ConditionOperator)
            .IsRequired()
            .HasMaxLength(50);
        builder.Property(c => c.ConditionValue)
            .IsRequired();
        builder.HasOne(c => c.Badge)
            .WithMany(b => b.Criteria)
            .HasForeignKey(c => c.BadgeId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
