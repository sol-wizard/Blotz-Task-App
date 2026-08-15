using BlotzTask.Modules.AiCoach.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public sealed class AiConversationEffectConfiguration : IEntityTypeConfiguration<AiConversationEffect>
{
    public void Configure(EntityTypeBuilder<AiConversationEffect> builder)
    {
        builder.ToTable("AiConversationEffects");
        builder.HasKey(effect => effect.Id);
        builder.Property(effect => effect.Type).HasMaxLength(80).IsRequired();
        builder.Property(effect => effect.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(effect => effect.IdempotencyKey).HasMaxLength(160).IsRequired();
        builder.Property(effect => effect.LastErrorCode).HasMaxLength(80);
        builder.Property(effect => effect.RowVersion).IsRowVersion();
        builder.HasAlternateKey(effect => new { effect.Id, effect.ConversationId });
        builder.HasIndex(effect => effect.IdempotencyKey).IsUnique();
        builder.HasIndex(effect => new { effect.Status, effect.LeaseExpiresAt });
        builder.ToTable(table =>
        {
            table.HasCheckConstraint(
                "CK_AiConversationEffects_AttemptCount",
                "[AttemptCount] >= 0");
            table.HasCheckConstraint(
                "CK_AiConversationEffects_RunningLease",
                "[Status] <> 'Running' OR [LeaseExpiresAt] IS NOT NULL");
            table.HasCheckConstraint(
                "CK_AiConversationEffects_TerminalCompletedAt",
                "[Status] NOT IN ('Completed', 'Failed', 'Superseded') OR [CompletedAt] IS NOT NULL");
        });
        builder.HasOne(effect => effect.Conversation)
            .WithMany(conversation => conversation.Effects)
            .HasForeignKey(effect => effect.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
