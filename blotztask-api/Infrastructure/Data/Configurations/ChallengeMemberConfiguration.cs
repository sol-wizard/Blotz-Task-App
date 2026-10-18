using BlotzTask.Modules.Challenges.Domain;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class ChallengeMemberConfiguration : IEntityTypeConfiguration<ChallengeMember>
{
    public void Configure(EntityTypeBuilder<ChallengeMember> builder)
    {
        builder.ToTable("ChallengeMembers");
        // The pair is the identity: a user can join a challenge only once.
        builder.HasKey(m => new { m.ChallengeId, m.MemberId });
        builder.HasOne<Challenge>()
            .WithMany()
            .HasForeignKey(m => m.ChallengeId)
            .OnDelete(DeleteBehavior.Cascade);
        // Restrict, not Cascade: AppUser already cascades here through Challenge, and SQL Server
        // rejects two cascade paths to one table. DeleteUser removes these rows first.
        builder.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(m => m.MemberId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(m => m.MemberId);
    }
}
