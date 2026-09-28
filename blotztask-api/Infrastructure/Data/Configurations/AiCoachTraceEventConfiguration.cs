using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public sealed class AiCoachTraceEventConfiguration : IEntityTypeConfiguration<AiCoachTraceEvent>
{
    public void Configure(EntityTypeBuilder<AiCoachTraceEvent> builder)
    {
        builder.ToTable("AiCoachTraceEvent");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => new { x.ConversationId, x.Id });
        builder.HasIndex(x => new { x.ConversationId, x.TurnId, x.Id });
        builder.HasIndex(x => new { x.UserId, x.ConversationId });
        builder.HasIndex(x => x.AssistantMessageId);
        builder.HasIndex(x => x.CreatedAt);
        builder.Property(x => x.Kind).HasMaxLength(48).IsRequired();
        builder.Property(x => x.Payload).HasColumnType("nvarchar(max)").IsRequired();
        builder.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
