using BlotzTask.Modules.Badges.Domain;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class UserProgressConfiguration : IEntityTypeConfiguration<UserProgress>
{
    public void Configure(EntityTypeBuilder<UserProgress> builder)
    {
        builder.ToTable("UserProgress");
        builder.HasKey(up => up.UserId);
        builder.Property(up => up.CreatedAtUtc)
            .HasDefaultValueSql("GETUTCDATE()");
        builder.Property(up => up.UpdatedAtUtc)
            .HasDefaultValueSql("GETUTCDATE()");
        builder.HasOne<AppUser>()
            .WithOne()
            .HasForeignKey<UserProgress>(up => up.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
