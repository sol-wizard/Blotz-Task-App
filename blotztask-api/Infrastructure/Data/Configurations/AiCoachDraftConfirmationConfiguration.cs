using BlotzTask.Modules.AiCoach.Domain.Conversations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public sealed class AiCoachDraftConfirmationConfiguration : IEntityTypeConfiguration<AiCoachDraftConfirmation>
{
    public void Configure(EntityTypeBuilder<AiCoachDraftConfirmation> builder)
    {
        builder.ToTable("AiCoachDraftConfirmation");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.HasIndex(x => new { x.ConversationId, x.DraftId }).IsUnique();
        builder.HasIndex(x => new { x.UserId, x.CommandId }).IsUnique();
        builder.Property(x => x.RequestHash).HasMaxLength(64).IsRequired();
        builder.Property(x => x.SavedDraftJson).HasColumnType("nvarchar(max)").IsRequired();
        builder.HasOne<AiCoachConversationRecord>().WithMany().HasForeignKey(x => x.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
