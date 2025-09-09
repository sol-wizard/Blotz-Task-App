using BlotzTask.Infrastructure.Data.Configurations;
using BlotzTask.Modules.Labels.Domain;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Infrastructure.Data;

public class BlotzTaskDbContext : DbContext
{
    public BlotzTaskDbContext(DbContextOptions options) : base(options) { }
    public DbSet<TaskItem> TaskItems { get; set; }
    public DbSet<Label> Labels { get; set; }
    public DbSet<DeletedTaskItem> DeletedTaskItems { get; set; }
    public DbSet<Subtask> Subtasks => Set<Subtask>();
    public DbSet<AppUser> AppUsers { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(SubtaskConfiguration).Assembly);
        modelBuilder.Entity<Label>().HasData(
            new Label
            {
                LabelId = 6,
                Name = "Work",
                Color = "#7758FF",
                Description = "Work related tasks"
            },
            new Label
            {
                LabelId = 7,
                Name = "Personal",
                Color = "#FFDE23",
                Description = "Personal tasks"
            },
            new Label
            {
                LabelId = 8,
                Name = "Academic",
                Color = "#FF4747",
                Description = "Academic tasks"
            },
            new Label
            {
                LabelId = 9,
                Name = "Others",
                Color = "#09F1D6",
                Description = "Other tasks"
            }
        );
        
        modelBuilder.Entity<AppUser>().HasData(new AppUser
        {
            Id = new Guid("718ccb8f-ce52-4e51-8cfe-2a44cdca77d1"),
            Auth0UserId = "auth0|68c03ab7a093c0727999a791",
            Email = "blotztest1@gmail.com",
            DisplayName = "blotztest1@gmail.com",
            PictureUrl = "https://s.gravatar.com/avatar/d7eee1179900d1154cf2b3a64f7f91dd?s=480&r=pg&d=https%3A%2F%2Fcdn.auth0.com%2Favatars%2Fbl.png",
            CreationAt = DateTime.Parse("2025-09-09T14:34:27.5756080Z"),
            SignUpAt = DateTime.Parse("2025-09-09T14:33:27.9550000Z"),
            UpdatedAt = DateTime.Parse("2025-09-09T14:34:27.5756080Z")
        });
    }
}