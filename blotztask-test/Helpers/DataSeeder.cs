using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Entities;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;

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

    public async Task<RecurringTask> CreateRecurringTaskAsync(
        Guid userId,
        string title,
        RecurrenceFrequency frequency,
        DateOnly startDate,
        DateTimeOffset templateStartTime,
        int interval = 1,
        int? daysOfWeek = null,
        DateOnly? endDate = null)
    {
        var recurring = new RecurringTask
        {
            UserId = userId,
            Title = title,
            TimeType = TaskTimeType.SingleTime,
            TemplateStartTime = templateStartTime,
            StartDate = startDate,
            EndDate = endDate,
            IsActive = true,
            Pattern = new RecurrencePattern
            {
                Frequency = frequency,
                Interval = interval,
                DaysOfWeek = daysOfWeek,
            }
        };

        _context.RecurringTasks.Add(recurring);
        await _context.SaveChangesAsync();
        return recurring;
    }

    public async Task<TaskItem> CreateTaskAsync(Guid userId, string title, DateTimeOffset start, DateTimeOffset end, DateTimeOffset? createdAt = null)
    {
        var task = new TaskItem
        {
            Title = title,
            UserId = userId,
            StartTime = start,
            EndTime = end,
            TimeType = start == end ? TaskTimeType.SingleTime : TaskTimeType.RangeTime,
            CreatedAt = createdAt?.DateTime ?? DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.TaskItems.Add(task);
        await _context.SaveChangesAsync();
        return task;
    }

    public async Task<UserSubscription> CreateUserSubscriptionAsync(Guid userId, int planId, DateTime? createdAt = null)
    {
        var subscription = new UserSubscription
        {
            UserId = userId,
            PlanId = planId,
            CreatedAt = createdAt ?? DateTime.UtcNow
        };

        _context.UserSubscriptions.Add(subscription);
        await _context.SaveChangesAsync();
        return subscription;
    }

    public async Task<SubscriptionPlan> CreateSubscriptionPlanAsync(string name, int monthlyTokenLimit)
    {
        var plan = new SubscriptionPlan
        {
            Name = name,
            MonthlyTokenLimit = monthlyTokenLimit
        };

        _context.SubscriptionPlans.Add(plan);
        await _context.SaveChangesAsync();
        return plan;
    }

    public async Task<AiUsageRecord> CreateAiUsageRecordAsync(Guid userId, int totalTokens, DateTime? createdAt = null)
    {
        var record = new AiUsageRecord
        {
            UserId = userId,
            PromptTokens = 0,
            CompletionTokens = 0,
            TotalTokens = totalTokens,
            CreatedAt = createdAt ?? DateTime.UtcNow
        };

        _context.AiUsageRecords.Add(record);
        await _context.SaveChangesAsync();
        return record;
    }
}
