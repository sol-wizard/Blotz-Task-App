using BlotzTask.Modules.Tasks.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class RecurringOccurrenceOverrideConfiguration : IEntityTypeConfiguration<RecurringOccurrenceOverride>
{
    public void Configure(EntityTypeBuilder<RecurringOccurrenceOverride> builder)
    {
        builder.ToTable("RecurringOccurrenceOverrides");

        builder.HasKey(o => o.Id);

        builder.Property(o => o.OverrideType)
            .IsRequired();

        builder.Property(o => o.CreatedAt)
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .ValueGeneratedOnAdd();

        builder.Property(o => o.UpdatedAt)
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .ValueGeneratedOnAddOrUpdate();

        builder.HasOne(o => o.Series)
            .WithMany(s => s.Overrides)
            .HasForeignKey(o => o.SeriesId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(o => o.RecurringTask)
            .WithMany()
            .HasForeignKey(o => o.RecurringTaskId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(o => new { o.SeriesId, o.OccurrenceDate })
            .IsUnique();
    }
}
