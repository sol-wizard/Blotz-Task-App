using BlotzTask.Modules.Reviews.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class ReviewReportConfiguration : IEntityTypeConfiguration<ReviewReport>
{
    public void Configure(EntityTypeBuilder<ReviewReport> builder)
    {
        builder.ToTable("ReviewReports");
        builder.HasKey(r => r.Id);

        builder.Property(r => r.UserId).IsRequired();
        builder.Property(r => r.PeriodType)
               .IsRequired()
               .HasConversion<string>()
               .HasMaxLength(20);
        builder.Property(r => r.PeriodStartUtc).IsRequired();
        builder.Property(r => r.PeriodEndUtc).IsRequired();
        builder.Property(r => r.AiGeneratedLetter).IsRequired();
        builder.Property(r => r.AiInputJson).IsRequired();
        builder.Property(r => r.AiModel).IsRequired().HasMaxLength(100);
        builder.Property(r => r.CreatedAt).IsRequired();
        builder.Property(r => r.UpdatedAt).IsRequired();

        builder.HasIndex(r => new { r.UserId, r.PeriodType, r.PeriodStartUtc }).IsUnique();

        builder.HasOne(r => r.User)
               .WithMany()
               .HasForeignKey(r => r.UserId)
               .OnDelete(DeleteBehavior.Cascade);
    }
}
