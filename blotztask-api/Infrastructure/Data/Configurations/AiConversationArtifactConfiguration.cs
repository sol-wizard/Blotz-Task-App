using BlotzTask.Modules.AiCoach.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public sealed class AiConversationArtifactConfiguration : IEntityTypeConfiguration<AiConversationArtifact>
{
    public void Configure(EntityTypeBuilder<AiConversationArtifact> builder)
    {
        builder.ToTable("AiConversationArtifacts");
        builder.HasKey(artifact => artifact.Id);
        builder.Property(artifact => artifact.Type)
            .HasColumnName("ArtifactType")
            .HasConversion<string>()
            .HasMaxLength(30);
        builder.Property(artifact => artifact.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(artifact => artifact.RowVersion).IsRowVersion();
        builder.Ignore(artifact => artifact.Detail);
        builder.HasAlternateKey(artifact => new { artifact.Id, artifact.ConversationId });

        builder.HasIndex(artifact => artifact.ConversationId)
            .IsUnique()
            .HasFilter("[Status] IN ('Pending', 'Processing')")
            .HasDatabaseName("UX_AiConversationArtifacts_OpenArtifact");

        builder.HasOne(artifact => artifact.Conversation)
            .WithMany(conversation => conversation.Artifacts)
            .HasForeignKey(artifact => artifact.ConversationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(artifact => artifact.SupersedesArtifact)
            .WithMany()
            .HasForeignKey(artifact => new { artifact.SupersedesArtifactId, artifact.ConversationId })
            .HasPrincipalKey(artifact => new { artifact.Id, artifact.ConversationId })
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(artifact => artifact.CreatedByEffect)
            .WithMany()
            .HasForeignKey(artifact => new { artifact.CreatedByEffectId, artifact.ConversationId })
            .HasPrincipalKey(effect => new { effect.Id, effect.ConversationId })
            .OnDelete(DeleteBehavior.NoAction);
    }
}

public sealed class AiTaskDraftArtifactConfiguration : IEntityTypeConfiguration<AiTaskDraftArtifact>
{
    public void Configure(EntityTypeBuilder<AiTaskDraftArtifact> builder)
    {
        builder.ToTable("AiTaskDraftArtifacts");
        builder.HasKey(draft => draft.ArtifactId);
        builder.Property(draft => draft.Kind).HasConversion<string>().HasMaxLength(20);
        builder.Property(draft => draft.Title).HasMaxLength(300).IsRequired();
        builder.Property(draft => draft.Description).HasMaxLength(4_000);
        builder.Property(draft => draft.TimeZoneId).HasMaxLength(100).IsRequired();
        builder.ToTable(table => table.HasCheckConstraint(
            "CK_AiTaskDraftArtifacts_EndAfterStart",
            "[EndTimeUtc] > [StartTimeUtc]"));

        builder.HasOne<AiConversationArtifact>()
            .WithOne()
            .HasForeignKey<AiTaskDraftArtifact>(draft => draft.ArtifactId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
