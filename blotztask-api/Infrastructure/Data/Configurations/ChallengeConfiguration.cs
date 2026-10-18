using BlotzTask.Modules.Challenges.Domain;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class ChallengeConfiguration : IEntityTypeConfiguration<Challenge>
{
    public void Configure(EntityTypeBuilder<Challenge> builder)
    {
        builder.ToTable("Challenges");
        builder.HasKey(c => c.Id);
        builder.Property(c => c.Name).HasMaxLength(100);
        builder.Property(c => c.Status).HasConversion<string>().HasMaxLength(20);
        builder.HasOne<AppUser>()
            .WithMany()
            .HasForeignKey(c => c.CreatorUserId)
            .OnDelete(DeleteBehavior.Cascade);
        // A user can only have one unfinished challenge they created; EndTime is set once it ends.
        builder.HasIndex(c => c.CreatorUserId)
            .IsUnique()
            .HasFilter("[EndTime] IS NULL");
    }
}
