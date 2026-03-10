using BlotzTask.Modules.Badges.Domain;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class UserBadgeConfiguration : IEntityTypeConfiguration<UserBadge>
{
    public void Configure(EntityTypeBuilder<UserBadge> builder)
    {
        builder.ToTable("UserBadges");
        builder.HasKey(ub => new { ub.UserId, ub.BadgeId });
        builder.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(ub => ub.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Badge>()
            .WithMany()
            .HasForeignKey(ub => ub.BadgeId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(ub => ub.UserId);
        builder.HasIndex(ub => ub.BadgeId);
    }
}
