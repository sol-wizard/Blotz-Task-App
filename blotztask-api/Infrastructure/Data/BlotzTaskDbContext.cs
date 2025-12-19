using BlotzTask.Infrastructure.Data.Configurations;
using BlotzTask.Modules.Labels.Domain;
using BlotzTask.Modules.Labels.Enums;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Infrastructure.Data;

public class BlotzTaskDbContext : DbContext
{
    public BlotzTaskDbContext(DbContextOptions options) : base(options)
    {
    }

    public DbSet<TaskItem> TaskItems { get; set; }
    public DbSet<Label> Labels { get; set; }
    public DbSet<DeletedTaskItem> DeletedTaskItems { get; set; }
    public DbSet<Subtask> Subtasks => Set<Subtask>();
    public DbSet<AppUser> AppUsers { get; set; }
    public DbSet<UserPreference> UserPreferences { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SubtaskConfiguration).Assembly);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TaskItemConfiguration).Assembly);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(DeletedTaskItemConfiguration).Assembly);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LabelConfiguration).Assembly);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppUserConfiguration).Assembly);

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

        modelBuilder.Entity<AppUser>()
            .HasData(new AppUser
            {
                Id = new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"),
                Auth0UserId = "auth0|68c03ab7a093c0727999a791",
                Email = "blotztest1@gmail.com",
                DisplayName = "blotztest1@gmail.com",
                PictureUrl =
                    "https://s.gravatar.com/avatar/d7eee1179900d1154cf2b3a64f7f91dd?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fbl.png",
                CreationAt = new DateTime(2025, 9, 9, 14, 34, 27, 575, DateTimeKind.Utc),
                SignUpAt = new DateTime(2025, 9, 9, 14, 33, 27, 955, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2025, 9, 9, 14, 34, 27, 575, DateTimeKind.Utc)
            });
    }
}