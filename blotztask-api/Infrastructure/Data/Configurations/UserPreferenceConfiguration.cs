using BlotzTask.Modules.Users.Domain;
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

            // Database-level default values
            builder.Property(x => x.AutoRollover)
                   .HasDefaultValue(true);

            builder.Property(x => x.UpcomingNotification)
                   .HasDefaultValue(true);

            builder.Property(x => x.OverdueNotification)
                   .HasDefaultValue(false);

            builder.Property(x => x.DailyPlanningNotification)
                   .HasDefaultValue(true);

            builder.Property(x => x.EveningWrapUpNotification)
                   .HasDefaultValue(true);
        }
    }
}
