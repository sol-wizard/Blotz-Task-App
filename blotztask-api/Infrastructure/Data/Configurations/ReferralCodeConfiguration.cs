using BlotzTask.Modules.Referrals.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class ReferralCodeConfiguration : IEntityTypeConfiguration<ReferralCode>
{
    public void Configure(EntityTypeBuilder<ReferralCode> builder)
    {
        builder.ToTable("ReferralCodes");
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Code).HasMaxLength(12);
        builder.HasIndex(r => r.OwnerUserId).IsUnique();
        builder.HasIndex(r => r.Code).IsUnique();
        builder.HasOne(r => r.Owner)
            .WithOne()
            .HasForeignKey<ReferralCode>(r => r.OwnerUserId);
    }
}
