using BlotzTask.Modules.Tasks.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class RecurringTaskSeriesConfiguration : IEntityTypeConfiguration<RecurringTaskSeries>
{
    public void Configure(EntityTypeBuilder<RecurringTaskSeries> builder)
    {
        builder.ToTable("RecurringTaskSeries");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.IsDeleted)
            .HasDefaultValue(false);

        builder.Property(s => s.CreatedAt)
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .ValueGeneratedOnAdd();

        builder.Property(s => s.UpdatedAt)
            .HasDefaultValueSql("SYSUTCDATETIME()")
            .ValueGeneratedOnAddOrUpdate();

        builder.HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => new { s.UserId, s.IsDeleted });
    }
}
