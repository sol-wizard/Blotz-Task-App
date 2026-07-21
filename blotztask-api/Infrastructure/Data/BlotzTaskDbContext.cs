using BlotzTask.Infrastructure.Data.Configurations;
using BlotzTask.Infrastructure.Data.SeedData;
using BlotzTask.Modules.Badges.Domain;
using BlotzTask.Modules.Labels.Domain;
using BlotzTask.Modules.Labels.Enums;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Users.Domain;
using BlotzTask.Modules.AiUsage.Entities;
using BlotzTask.Modules.Reviews.Domain;
using BlotzTask.Modules.Notes.Domain;
using BlotzTask.Modules.Pomodoro.Domain;
using BlotzTask.Modules.Invites.Domain;
using Microsoft.EntityFrameworkCore;


namespace BlotzTask.Infrastructure.Data;

public class BlotzTaskDbContext : DbContext
{
    public BlotzTaskDbContext(DbContextOptions options) : base(options)
    {
    }

    public DbSet<TaskItem> TaskItems { get; set; }
    public DbSet<TaskDeadline> TaskDeadlines { get; set; }
    public DbSet<RecurringTaskSeries> RecurringTaskSeries { get; set; }
    public DbSet<RecurringTask> RecurringTasks { get; set; }
    public DbSet<RecurringOccurrenceOverride> RecurringOccurrenceOverrides { get; set; }
    public DbSet<Label> Labels { get; set; }
    public DbSet<DeletedTaskItem> DeletedTaskItems { get; set; }
    public DbSet<Subtask> Subtasks => Set<Subtask>();
    public DbSet<AppUser> AppUsers { get; set; }
    public DbSet<UserPreference> UserPreferences { get; set; }
    public DbSet<PomodoroSetting> PomodoroSetting { get; set; }
    public DbSet<Note> Notes { get; set; }
    public DbSet<Badge> Badges { get; set; }
    public DbSet<BadgeCriteria> BadgeCriteria { get; set; }
    public DbSet<UserBadge> UserBadges { get; set; }
    public DbSet<UserProgress> UserProgress { get; set; }
    public DbSet<SubscriptionPlan> SubscriptionPlans { get; set; }
    public DbSet<UserSubscription> UserSubscriptions { get; set; }
    public DbSet<AiUsageRecord> AiUsageRecords { get; set; }
    public DbSet<ReviewReport> ReviewReports { get; set; }
    public DbSet<UserPushToken> UserPushTokens { get; set; }

    public DbSet<InviteRedemption> InviteRedemptions {get;set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SubtaskConfiguration).Assembly);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TaskItemConfiguration).Assembly);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TaskDeadlineConfiguration).Assembly);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DeletedTaskItemConfiguration).Assembly);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LabelConfiguration).Assembly);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppUserConfiguration).Assembly);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(NoteConfiguration).Assembly);

        modelBuilder.Entity<Label>().HasData(
            new Label
            {
                LabelId = 6,
                Name = "Work",
                Color = "#c2e49f",
                Description = "Work related tasks",
                Scope = LabelScope.Global,
                UserId = null
            },
            new Label
            {
                LabelId = 7,
                Name = "Life",
                Color = "#cce7db",
                Description = "Life related tasks",
                Scope = LabelScope.Global,
                UserId = null
            },
            new Label
            {
                LabelId = 8,
                Name = "Learning",
                Color = "#d6faf9",
                Description = "Learning related tasks",
                Scope = LabelScope.Global,
                UserId = null
            },
            new Label
            {
                LabelId = 9,
                Name = "Health",
                Color = "#bad5fa",
                Description = "Health related tasks",
                Scope = LabelScope.Global,
                UserId = null
            }
        );

        modelBuilder.Entity<SubscriptionPlan>()
            .HasData(
                new SubscriptionPlan { Id = 1, Name = "Free", MonthlyTokenLimit = 300_000 },
                new SubscriptionPlan { Id = 2, Name = "Pro", MonthlyTokenLimit = 3_000_000 }
            );

        TestUserSeedData.Apply(modelBuilder);
    }
}
