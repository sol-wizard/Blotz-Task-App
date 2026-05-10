using BlotzTask.Modules.MonthlyReviews.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class MonthlyReviewReportConfiguration : IEntityTypeConfiguration<MonthlyReviewReport>
{
    public void Configure(EntityTypeBuilder<MonthlyReviewReport> builder)
    {
        builder.ToTable("MonthlyReviewReports");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.UserId).IsRequired();
        builder.Property(r => r.Year).IsRequired();
        builder.Property(r => r.Month).IsRequired();
        builder.Property(r => r.AiGeneratedLetter).IsRequired();
        builder.Property(r => r.AiInputSnapshotJson).IsRequired();
        builder.Property(r => r.AiModel).IsRequired().HasMaxLength(100);
        builder.Property(r => r.CreatedAt).IsRequired();
        builder.Property(r => r.UpdatedAt).IsRequired();

        builder.HasIndex(r => new { r.UserId, r.Year, r.Month }).IsUnique();

        builder.HasOne(r => r.User)
               .WithMany()
               .HasForeignKey(r => r.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
