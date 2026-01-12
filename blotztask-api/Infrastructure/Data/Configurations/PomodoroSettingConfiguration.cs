using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

public class PomodoroSettingConfiguration
    : IEntityTypeConfiguration<PomodoroSetting>
{
    public void Configure(EntityTypeBuilder<PomodoroSetting> builder)
    {
        builder.ToTable("PomodoroSettings");


        builder.HasKey(p => p.UserId);


        builder.HasOne(p => p.User)
               .WithOne(u => u.PomodoroSetting)
               .HasForeignKey<PomodoroSetting>(p => p.UserId)
               .OnDelete(DeleteBehavior.Cascade);


        builder.Property(p => p.Timing)
               .HasDefaultValue(25)
               .IsRequired();

        builder.Property(p => p.Sound)
               .HasDefaultValue(null);

        builder.Property(p => p.IsCountdown)
               .HasDefaultValue(false)
               .IsRequired();
    }
}
