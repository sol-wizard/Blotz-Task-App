using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetTasksByDateTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly GetTasksByDateQueryHandler _handler;
    private readonly Guid _testUserId;

    public GetTasksByDateTests(DatabaseFixture fixture)
    {
        _context = fixture.Context;
        _testUserId = fixture.TestUserId;
        var logger = TestDbContextFactory.CreateLogger<GetTasksByDateQueryHandler>();
        _handler = new GetTasksByDateQueryHandler(_context, logger);
    }

    [Fact]
    public async Task Handle_ShouldReturn_OnlyTasksWithinThe24HourWindow()
    {
        // Arrange
        // Simulate a user in UTC+8 selecting "2024-11-21"
        // Their "Start of Day" is 2024-11-21 00:00:00 +08:00 -> 2024-11-20 16:00:00 UTC
        var clientStartDateUtc = new DateTime(2024, 11, 20, 16, 0, 0, DateTimeKind.Utc);
        
        // The API calculates the window as: [clientStartDateUtc] to [clientStartDateUtc + 1 Day]
        // Window: Nov 20 16:00 UTC -> Nov 21 16:00 UTC

        var taskInsideWindow = new TaskItem
        {
            Title = "Task Inside Window",
            UserId = _testUserId,
            // 2 hours after start of window
            StartTime = clientStartDateUtc.AddHours(2), 
            EndTime = clientStartDateUtc.AddHours(3),
            TimeType = TaskTimeType.RangeTime,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var taskSpanningWindow = new TaskItem
        {
            Title = "Task Spanning Window",
            UserId = _testUserId,
            // Starts before window, ends inside
            StartTime = clientStartDateUtc.AddHours(-1),
            EndTime = clientStartDateUtc.AddHours(1),
            TimeType = TaskTimeType.RangeTime,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var taskOutsideBefore = new TaskItem
        {
            Title = "Task Outside (Before)",
            UserId = _testUserId,
            // Ends exactly when window starts (should ideally not match, or depending on >= logic)
            // Logic is: t.StartTime < endDateUtc && t.EndTime >= query.StartDateUtc
            // If EndTime is 15:00 (before 16:00), it shouldn't match
            StartTime = clientStartDateUtc.AddHours(-5),
            EndTime = clientStartDateUtc.AddHours(-4), 
            TimeType = TaskTimeType.RangeTime,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var taskOutsideAfter = new TaskItem
        {
            Title = "Task Outside (After)",
            UserId = _testUserId,
            // Starts exactly when window ends
            StartTime = clientStartDateUtc.AddDays(1).AddHours(1),
            EndTime = clientStartDateUtc.AddDays(1).AddHours(2),
            TimeType = TaskTimeType.RangeTime,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.TaskItems.AddRangeAsync(taskInsideWindow, taskSpanningWindow, taskOutsideBefore, taskOutsideAfter);
        await _context.SaveChangesAsync();

        var query = new GetTasksByDateQuery
        {
            UserId = _testUserId,
            StartDateUtc = clientStartDateUtc,
            IncludeFloatingForToday = false
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().Contain(t => t.Title == "Task Inside Window");
        result.Should().Contain(t => t.Title == "Task Spanning Window");
        result.Should().NotContain(t => t.Title == "Task Outside (Before)");
        result.Should().NotContain(t => t.Title == "Task Outside (After)");
    }
}

