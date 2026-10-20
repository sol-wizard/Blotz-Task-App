using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public sealed class AiCoachConversationConfiguration : IEntityTypeConfiguration<AiCoachConversationRecord>
{
    public void Configure(EntityTypeBuilder<AiCoachConversationRecord> builder)
    {
        builder.ToTable("AiCoachConversation");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.HasIndex(x => new { x.UserId, x.LastActivityAt });
        builder.HasIndex(x => x.LastActivityAt);
        builder.HasIndex(x => x.UserId).IsUnique().HasFilter("[EndedAt] IS NULL");
        builder.Property(x => x.ClosingSummary).HasColumnType("nvarchar(max)");
        builder.Property(x => x.Payload).HasColumnType("nvarchar(max)").IsRequired();
        builder.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
