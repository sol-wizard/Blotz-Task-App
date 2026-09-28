using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public sealed class AiCoachFeedbackConfiguration : IEntityTypeConfiguration<AiCoachFeedback>
{
    public void Configure(EntityTypeBuilder<AiCoachFeedback> builder)
    {
        builder.ToTable("AiCoachFeedback");
        builder.HasKey(x => new { x.UserId, x.AssistantMessageId });
        builder.HasIndex(x => new { x.Rating, x.UpdatedAt });
        builder.HasIndex(x => new { x.UserId, x.ConversationId });
        builder.Property(x => x.Rating).HasMaxLength(8).IsRequired();
        builder.Property(x => x.Reason).HasMaxLength(64);
        builder.Property(x => x.Detail).HasMaxLength(500);
        builder.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
