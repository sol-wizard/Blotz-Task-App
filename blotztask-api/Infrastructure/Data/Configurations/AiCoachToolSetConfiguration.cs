using BlotzTask.Modules.AiCoach.Domain.Conversations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public sealed class AiCoachToolSetConfiguration : IEntityTypeConfiguration<AiCoachToolSet>
{
    public void Configure(EntityTypeBuilder<AiCoachToolSet> builder)
    {
        builder.ToTable("AiCoachToolSet");
        builder.HasKey(x => x.Hash);
        builder.Property(x => x.Hash).HasMaxLength(64).IsUnicode(false);
        builder.Property(x => x.Definitions).HasColumnType("nvarchar(max)").IsRequired();
    }
}
