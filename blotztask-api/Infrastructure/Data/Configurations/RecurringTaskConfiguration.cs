using BlotzTask.Modules.Tasks.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class RecurringTaskConfiguration : IEntityTypeConfiguration<RecurringTask>
{
    public void Configure(EntityTypeBuilder<RecurringTask> builder)
    {
        builder.ToTable("RecurringTasks");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(r => r.IsActive)
            .HasDefaultValue(true);

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
    }
}
