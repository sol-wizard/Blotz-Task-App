using BlotzTask.Modules.Tasks.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class RecurringTaskConfiguration : IEntityTypeConfiguration<RecurringTask>
{
    public void Configure(EntityTypeBuilder<RecurringTask> builder)
    {
        builder.ToTable("RecurringTasks", t =>
        {
            t.HasCheckConstraint(
                "CK_RecurringTask_Deadline_Template_Complete",
                "(" +
                "([IsDeadline] = 0 AND [DeadlineOffsetDays] IS NULL AND [DeadlineTimeOfDay] IS NULL AND [DeadlineTimeZoneId] IS NULL)" +
                " OR " +
                "([IsDeadline] = 1 AND [DeadlineOffsetDays] IS NOT NULL AND [DeadlineTimeOfDay] IS NOT NULL AND [DeadlineTimeZoneId] IS NOT NULL)" +
                ")");

            t.HasCheckConstraint(
                "CK_RecurringTask_Deadline_Offset_NonNegative",
                "([DeadlineOffsetDays] IS NULL OR [DeadlineOffsetDays] >= 0)");
        });

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(r => r.IsActive)
            .HasDefaultValue(true);

        builder.Property(r => r.IsDeadline)
            .HasDefaultValue(false);

        builder.Property(r => r.DeadlineTimeZoneId)
            .HasMaxLength(100);

        builder.Property(r => r.CreatedAt)
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .ValueGeneratedOnAdd();

        builder.Property(r => r.UpdatedAt)
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .ValueGeneratedOnAddOrUpdate();

        builder.HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.Series)
            .WithMany(s => s.Versions)
            .HasForeignKey(r => r.SeriesId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(r => r.PreviousRecurringTask)
            .WithMany()
            .HasForeignKey(r => r.PreviousRecurringTaskId)
            .OnDelete(DeleteBehavior.NoAction);

        // RecurrencePattern is stored in the same RecurringTasks table row.
        // Column names are set explicitly to avoid the default "Pattern_X" prefix.
        builder.OwnsOne(r => r.Pattern, pattern =>
        {
            pattern.Property(p => p.Frequency).HasColumnName("Frequency").IsRequired();
            pattern.Property(p => p.Interval).HasColumnName("Interval").HasDefaultValue(1);
            pattern.Property(p => p.DaysOfWeek).HasColumnName("DaysOfWeek");
            pattern.Property(p => p.DayOfMonth).HasColumnName("DayOfMonth");
        });

        builder.HasIndex(r => new { r.UserId, r.IsActive });
        builder.HasIndex(r => new { r.SeriesId, r.StartDate, r.EndDate });
    }
}
