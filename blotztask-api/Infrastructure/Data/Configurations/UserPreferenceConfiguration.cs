using BlotzTask.Modules.Users.Domain;
using BlotzTask.Modules.Users.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BlotzTask.Infrastructure.Data.Configurations
{
    public class UserPreferenceConfiguration : IEntityTypeConfiguration<UserPreference>
    {
        public void Configure(EntityTypeBuilder<UserPreference> builder)
        {
            // Table name
            builder.ToTable("UserPreferences");

            // Primary Key: enforce one row per user
            builder.HasKey(x => x.UserId);

            builder.HasOne<AppUser>()
                   .WithOne()
                   .HasForeignKey<UserPreference>(x => x.UserId)
                   .OnDelete(DeleteBehavior.Cascade);

            // Database-level default values
            builder.Property(x => x.AutoRollover)
                   .HasDefaultValue(true);

            builder.Property(x => x.UpcomingNotification)
                   .HasDefaultValue(true);

            builder.Property(x => x.OverdueNotification)
                   .HasDefaultValue(true);

            builder.Property(x => x.DailyPlanningNotification)
                   .HasDefaultValue(false);

            builder.Property(x => x.EveningWrapUpNotification)
                   .HasDefaultValue(false);

            // Store Language enum as string in database
            builder.Property(x => x.PreferredLanguage)
                   .HasConversion<string>()
                   .HasDefaultValue(Language.En);
        }
    }
}
