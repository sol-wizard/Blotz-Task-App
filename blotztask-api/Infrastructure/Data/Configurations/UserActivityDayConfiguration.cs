using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class UserActivityDayConfiguration : IEntityTypeConfiguration<UserActivityDay>
{
    public void Configure(EntityTypeBuilder<UserActivityDay> builder)
    {
        builder.ToTable("UserActivityDays");
        // The pair is the identity: it enforces one row per user per day and serves both the
        // insert-if-missing check and the per-period count.
        builder.HasKey(a => new { a.UserId, a.LocalDate });
        builder.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
