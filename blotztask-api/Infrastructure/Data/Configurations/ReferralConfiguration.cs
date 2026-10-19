using BlotzTask.Modules.Referrals.Domain;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class ReferralConfiguration : IEntityTypeConfiguration<Referral>
{
    public void Configure(EntityTypeBuilder<Referral> builder)
    {
        builder.ToTable("Referrals");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.CodeUsed).IsRequired().HasMaxLength(12);
        builder.HasIndex(r => r.RefereeUserId).IsUnique();

        builder.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(r=>r.ReferrerUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(r=>r.RefereeUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
