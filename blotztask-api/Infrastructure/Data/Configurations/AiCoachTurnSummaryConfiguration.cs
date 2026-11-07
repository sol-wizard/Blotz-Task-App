using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public sealed class AiCoachTurnSummaryConfiguration : IEntityTypeConfiguration<AiCoachTurnSummary>
{
    public void Configure(EntityTypeBuilder<AiCoachTurnSummary> builder)
    {
        builder.ToTable("AiCoachTurnSummary");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => x.CreatedAt);
        builder.HasIndex(x => new { x.UserId, x.CreatedAt });
        builder.HasIndex(x => x.TurnId);
        builder.HasIndex(x => x.DraftId);
        builder.Property(x => x.DraftOutcome).HasMaxLength(16).IsUnicode(false);
        builder.Property(x => x.Kind).HasMaxLength(16).IsUnicode(false).IsRequired();
        builder.Property(x => x.Source).HasMaxLength(16).IsUnicode(false);
        builder.Property(x => x.Model).HasMaxLength(64);
        builder.Property(x => x.DeploymentId).HasMaxLength(128);
        builder.Property(x => x.Api).HasMaxLength(32).IsUnicode(false);
        builder.Property(x => x.PromptVersion).HasMaxLength(64);
        builder.Property(x => x.ToolContractVersion).HasMaxLength(64);
        builder.Property(x => x.ErrorCode).HasMaxLength(64).IsUnicode(false);
        builder.Property(x => x.CommitStatus).HasMaxLength(32).IsUnicode(false);
        builder.Property(x => x.ToolNames).HasMaxLength(1000).IsUnicode(false);
        builder.Property(x => x.EstimatedUsd).HasPrecision(18, 8);
        builder.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
