using BlotzTask.Modules.AiCoach.Domain.Conversations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public sealed class AiCoachMessageConfiguration : IEntityTypeConfiguration<AiCoachMessage>
{
    public void Configure(EntityTypeBuilder<AiCoachMessage> builder)
    {
        builder.ToTable("AiCoachMessage");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedNever();
        builder.Property(x => x.Role).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(x => x.Content).HasColumnType("nvarchar(max)").IsRequired();
        builder.Property(x => x.DraftSnapshot).HasColumnType("nvarchar(max)");
        builder.HasIndex(x => new { x.UserId, x.CreatedAt, x.Id }).IsDescending(false, true, true);
        builder.HasIndex(x => x.CreatedAt);
        builder.HasOne<AiCoachConversationRecord>().WithMany().HasForeignKey(x => x.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
