using BlotzTask.Modules.AiUsage.Entities;
using BlotzTask.Modules.Pomodoro.Domain;
using BlotzTask.Modules.Users.Domain;
using BlotzTask.Modules.Users.Enums;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Infrastructure.Data.SeedData;

public static class TestUserSeedData
{
    public static readonly Guid UserId = new("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1");
    public static readonly Guid UserSubscriptionId = new("a1b2c3d4-e5f6-7890-abcd-ef1234567890");

    private static readonly DateTime CreatedAtUtc = new(2025, 9, 9, 14, 34, 27, 575, DateTimeKind.Utc);
    private static readonly DateTime SignUpAtUtc = new(2025, 9, 9, 14, 33, 27, 955, DateTimeKind.Utc);

    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppUser>()
            .HasData(new AppUser
            {
                Id = UserId,
                Auth0UserId = "auth0|68c03ab7a093c0727999a791",
                Email = "blotztest1@gmail.com",
                DisplayName = "blotztest1@gmail.com",
                PictureUrl =
                    "https://s.gravatar.com/avatar/d7eee1179900d1154cf2b3a64f7f91dd?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fbl.png",
                CreationAt = CreatedAtUtc,
                SignUpAt = SignUpAtUtc,
                UpdatedAt = CreatedAtUtc,
                LoginAt = CreatedAtUtc,
                IsOnboarded = false
            });

        modelBuilder.Entity<UserPreference>()
            .HasData(new UserPreference
            {
                UserId = UserId,
                AutoRollover = true,
                UpcomingNotification = true,
                OverdueNotification = true,
                DailyPlanningNotification = false,
                EveningWrapUpNotification = false,
                PreferredLanguage = Language.Zh
            });

        modelBuilder.Entity<PomodoroSetting>()
            .HasData(new PomodoroSetting
            {
                UserId = UserId,
                Timing = 25,
                Sound = null,
                IsCountdown = false
            });

        modelBuilder.Entity<UserSubscription>()
            .HasData(new UserSubscription
            {
                Id = UserSubscriptionId,
                UserId = UserId,
                PlanId = 1,
                CreatedAt = CreatedAtUtc
            });
    }
}
