using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Users.Domain;

namespace BlotzTask.Tests.Helpers;

public class DataSeeder
{
    private readonly BlotzTaskDbContext _context;

    public DataSeeder(BlotzTaskDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> CreateUserAsync()
    {
        var userId = Guid.NewGuid();
        var user = new AppUser
        {
            Id = userId,
            Auth0UserId = $"test|{userId}",
            Email = $"test_{userId}@example.com",
            DisplayName = "Test User",
            PictureUrl = "https://example.com/pic.png",
            CreationAt = DateTime.UtcNow,
            SignUpAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.AppUsers.Add(user);
        await _context.SaveChangesAsync();
        return userId;
    }

    public async Task<TaskItem> CreateTaskAsync(Guid userId, string title, DateTimeOffset start, DateTimeOffset end)
    {
        var task = new TaskItem
        {
            Title = title,
            UserId = userId,
            StartTime = start,
            EndTime = end,
            TimeType = TaskTimeType.RangeTime,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.TaskItems.Add(task);
        await _context.SaveChangesAsync();
        return task;
    }
}

