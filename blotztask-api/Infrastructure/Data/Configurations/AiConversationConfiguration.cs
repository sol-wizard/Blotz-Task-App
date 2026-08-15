using BlotzTask.Modules.AiCoach.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public sealed class AiConversationConfiguration : IEntityTypeConfiguration<AiConversation>
{
    public void Configure(EntityTypeBuilder<AiConversation> builder)
    {
        builder.ToTable("AiConversations");
        builder.HasKey(conversation => conversation.Id);

        builder.Property(conversation => conversation.Mode).HasConversion<string>().HasMaxLength(20);
        builder.Property(conversation => conversation.LifecycleStatus).HasConversion<string>().HasMaxLength(20);
        builder.Property(conversation => conversation.State).HasConversion<string>().HasMaxLength(40);
        builder.Property(conversation => conversation.GenerationStatus).HasConversion<string>().HasMaxLength(20);
        builder.Property(conversation => conversation.BlockedReason).HasConversion<string>().HasMaxLength(30);
        builder.Property(conversation => conversation.RuleVersion).HasMaxLength(30).IsRequired();
        builder.Property(conversation => conversation.PromptVersion).HasMaxLength(30).IsRequired();
        builder.Property(conversation => conversation.ModelDeploymentPolicyVersion).HasMaxLength(30).IsRequired();
        builder.Property(conversation => conversation.ToolsetVersion).HasMaxLength(30).IsRequired();
        builder.Property(conversation => conversation.MemoryProfileId).HasMaxLength(50).IsRequired();
        builder.Property(conversation => conversation.ActiveConversationSlot).HasMaxLength(50);
        builder.Property(conversation => conversation.RowVersion).IsRowVersion();

        builder.HasIndex(conversation => new { conversation.UserId, conversation.Mode, conversation.LifecycleStatus });
        builder.HasIndex(conversation => new { conversation.UserId, conversation.ActiveConversationSlot })
            .IsUnique()
            .HasFilter("[ActiveConversationSlot] IS NOT NULL")
            .HasDatabaseName("UX_AiConversations_ActiveSlot");

        builder.HasOne(conversation => conversation.User)
            .WithMany()
            .HasForeignKey(conversation => conversation.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(conversation => conversation.CurrentArtifact)
            .WithMany()
            .HasForeignKey(conversation => new { conversation.CurrentArtifactId, conversation.Id })
            .HasPrincipalKey(artifact => new { artifact.Id, artifact.ConversationId })
            .OnDelete(DeleteBehavior.NoAction);
    }
}

public sealed class AiConversationMessageConfiguration : IEntityTypeConfiguration<AiConversationMessage>
{
    public void Configure(EntityTypeBuilder<AiConversationMessage> builder)
    {
        builder.ToTable("AiConversationMessages");
        builder.HasKey(message => message.Id);
        builder.Property(message => message.Role).HasConversion<string>().HasMaxLength(20);
        builder.Property(message => message.Content).HasMaxLength(10_000).IsRequired();

        builder.HasIndex(message => new { message.ConversationId, message.TurnNumber, message.Sequence }).IsUnique();

        builder.HasOne(message => message.Conversation)
            .WithMany(conversation => conversation.Messages)
            .HasForeignKey(message => message.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(message => message.Artifact)
            .WithMany()
            .HasForeignKey(message => new { message.ArtifactId, message.ConversationId })
            .HasPrincipalKey(artifact => new { artifact.Id, artifact.ConversationId })
            .OnDelete(DeleteBehavior.NoAction);
    }
}
