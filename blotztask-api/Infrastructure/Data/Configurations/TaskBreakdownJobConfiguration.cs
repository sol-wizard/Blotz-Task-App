using BlotzTask.Modules.BreakDown.Domain;
using BlotzTask.Modules.Tasks.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class TaskBreakdownJobConfiguration : IEntityTypeConfiguration<TaskBreakdownJob>
{
    public void Configure(EntityTypeBuilder<TaskBreakdownJob> builder)
    {
        builder.ToTable("TaskBreakdownJobs");
        builder.HasKey(j => j.Id);
        // One job per task, so two taps on breakdown can never start two runs.
        builder.HasIndex(j => j.TaskItemId).IsUnique();
        builder.HasOne<TaskItem>()
            .WithMany()
            .HasForeignKey(j => j.TaskItemId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.Property(j => j.Status)
            .IsRequired()
            .HasMaxLength(50)
            .HasConversion<string>();
        builder.Property(j => j.ErrorCode)
            .HasMaxLength(100);
    }
}
