using BlotzTask.Modules.Tasks.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class TaskDeadlineConfiguration : IEntityTypeConfiguration<TaskDeadline>
{
    public void Configure(EntityTypeBuilder<TaskDeadline> builder)
    {
        builder.ToTable("TaskDeadlines");

        builder.HasKey(td => td.Id);

        builder.Property(td => td.DueAt)
            .IsRequired();

        builder.Property(td => td.CreatedAt)
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .ValueGeneratedOnAdd();

        builder.Property(td => td.UpdatedAt)
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .ValueGeneratedOnAddOrUpdate();

        builder.Property(td => td.IsPinned)
            .HasDefaultValue(false);

        builder.HasOne(td => td.TaskItem)
            .WithOne(t => t.Deadline)
            .HasForeignKey<TaskDeadline>(td => td.TaskItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(td => td.TaskItemId)
            .IsUnique();

        builder.HasIndex(td => td.DueAt);
        
        builder.HasIndex(td => new { td.IsPinned, td.DueAt });
    }
}
