using BlotzTask.Modules.Tasks.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;
public class SubtaskConfiguration : IEntityTypeConfiguration<Subtask>
{
    public void Configure(EntityTypeBuilder<Subtask> b)
    {
        b.ToTable("Subtasks");
        b.HasKey(x => x.Id);

        b.Property(x => x.Title)
            .IsRequired()
            .HasMaxLength(200);

        b.Property(x => x.Description)
            .HasMaxLength(2000);

        b.HasIndex(x => x.ParentTaskId);

        b.HasOne(x => x.ParentTask)
            .WithMany(t => t.Subtasks)
            .HasForeignKey(x => x.ParentTaskId)
            .OnDelete(DeleteBehavior.Cascade);

        b.Property(x => x.CreatedAt)
            .HasDefaultValueSql("GETUTCDATE()");
        
        b.Property(x => x.UpdatedAt)
            .HasDefaultValueSql("GETUTCDATE()");
    }
}
