using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations;

public class UserPushTokenConfiguration : IEntityTypeConfiguration<UserPushToken>
{
    public void Configure(EntityTypeBuilder<UserPushToken> builder)
    {
        builder.ToTable("UserPushTokens");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Token).IsRequired();
        builder.Property(t => t.DeviceId).IsRequired().HasMaxLength(500);
        builder.HasOne(t => t.User)
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(t => t.UserId);
        builder.HasIndex(t => t.DeviceId).IsUnique();
    }
}
