using BlotzTask.Modules.Users.Domain;
using BlotzTask.Modules.UserUnderstanding.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public sealed class UserMemoryConfiguration : IEntityTypeConfiguration<UserMemory>
{
    public void Configure(EntityTypeBuilder<UserMemory> builder)
    {
        builder.ToTable("UserMemories");
        builder.HasKey(x => x.Id);
        builder.HasIndex(x => new { x.UserId, x.Status });
        builder.HasIndex(x => new { x.UserId, x.ContentHash });
        builder.Property(x => x.Kind).HasConversion<string>().HasMaxLength(24);
        builder.Property(x => x.Scope).HasConversion<string>().HasMaxLength(16);
        builder.Property(x => x.Source).HasConversion<string>().HasMaxLength(24);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
        builder.Property(x => x.Content).HasMaxLength(UserMemory.MaxContentLength).IsRequired();
        builder.Property(x => x.ContentHash).HasMaxLength(64).IsRequired();
        builder.Property(x => x.EvidenceExcerpt).HasMaxLength(UserMemory.MaxEvidenceLength);
        builder.Ignore(x => x.Ref);
        builder.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
