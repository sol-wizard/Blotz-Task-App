using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.BreakDown.Domain;
using BlotzTask.Modules.BreakDown.Enums;
using BlotzTask.Modules.BreakDown.Queries;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Shared.Exceptions;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetTaskBreakdownStatusTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly GetTaskBreakdownStatusQueryHandler _handler;

    public GetTaskBreakdownStatusTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _handler = new GetTaskBreakdownStatusQueryHandler(_context);
    }

    [Fact]
    public async Task Handle_Running_ReturnsServerPollingInterval()
    {
        // Arrange
        var (userId, taskId) = await CreateUserWithTaskAsync();
        await AddJobAsync(taskId, BreakdownJobStatus.Running, DateTimeOffset.UtcNow);

        // Act
        var result = await _handler.Handle(new GetTaskBreakdownStatusQuery { TaskItemId = taskId, UserId = userId });

        // Assert
        result.Status.Should().Be(BreakdownJobStatus.Running, because: "the run has only just started");
        result.RetryAfterSeconds.Should().Be(GetTaskBreakdownStatusQueryHandler.RetryAfterSeconds,
            because: "the server, not the app, decides how often the app asks again");
    }

    [Fact]
    public async Task Handle_RunningPastMaxRunTime_ReportsFailedTimedOut()
    {
        // Arrange
        var (userId, taskId) = await CreateUserWithTaskAsync();
        var lostStart = DateTimeOffset.UtcNow - TaskBreakdownJob.MaxRunTime - TimeSpan.FromMinutes(1);
        await AddJobAsync(taskId, BreakdownJobStatus.Running, lostStart);

        // Act
        var result = await _handler.Handle(new GetTaskBreakdownStatusQuery { TaskItemId = taskId, UserId = userId });

        // Assert
        result.Status.Should().Be(BreakdownJobStatus.Failed,
            because: "a run lost to a restart must not keep the app waiting forever");
        result.ErrorCode.Should().Be(GetTaskBreakdownStatusQueryHandler.TimedOutErrorCode,
            because: "the app shows the retry message for it");
        result.RetryAfterSeconds.Should().BeNull(because: "the app stops polling once the run has ended");
    }

    [Fact]
    public async Task Handle_Failed_ReturnsErrorCode()
    {
        // Arrange
        var (userId, taskId) = await CreateUserWithTaskAsync();
        await AddJobAsync(taskId, BreakdownJobStatus.Failed, DateTimeOffset.UtcNow, errorCode: "BlockedByContentFilter");

        // Act
        var result = await _handler.Handle(new GetTaskBreakdownStatusQuery { TaskItemId = taskId, UserId = userId });

        // Assert
        result.Status.Should().Be(BreakdownJobStatus.Failed, because: "the run ended with an error");
        result.ErrorCode.Should().Be("BlockedByContentFilter", because: "the app can tell why it failed");
    }

    [Fact]
    public async Task Handle_NeverBrokenDown_ReturnsNoStatus()
    {
        // Arrange
        var (userId, taskId) = await CreateUserWithTaskAsync();

        // Act
        var result = await _handler.Handle(new GetTaskBreakdownStatusQuery { TaskItemId = taskId, UserId = userId });

        // Assert
        result.Status.Should().BeNull(
            because: "a task that was never broken down is a normal case, not an error the app would toast");
        result.RetryAfterSeconds.Should().BeNull(because: "there is nothing to poll for");
    }

    [Fact]
    public async Task Handle_TaskOwnedByDifferentUser_ThrowsNotFoundException()
    {
        // Arrange
        var (_, taskId) = await CreateUserWithTaskAsync();
        var (otherUserId, _) = await CreateUserWithTaskAsync();
        await AddJobAsync(taskId, BreakdownJobStatus.Running, DateTimeOffset.UtcNow);

        // Act
        var act = () => _handler.Handle(new GetTaskBreakdownStatusQuery { TaskItemId = taskId, UserId = otherUserId });

        // Assert
        await act.Should().ThrowAsync<NotFoundException>(because: "users can only see their own tasks' breakdowns");
    }

    [Fact]
    public async Task GetTasksByDate_RunningBreakdown_MarksTaskAsBreakingDown()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var dayStartUtc = new DateTimeOffset(2024, 11, 20, 14, 0, 0, TimeSpan.Zero);
        var running = await _seeder.CreateTaskAsync(userId, "Running", dayStartUtc.AddHours(1), dayStartUtc.AddHours(2));
        var lost = await _seeder.CreateTaskAsync(userId, "Lost", dayStartUtc.AddHours(3), dayStartUtc.AddHours(4));
        var idle = await _seeder.CreateTaskAsync(userId, "Idle", dayStartUtc.AddHours(5), dayStartUtc.AddHours(6));
        await AddJobAsync(running.Id, BreakdownJobStatus.Running, DateTimeOffset.UtcNow);
        await AddJobAsync(lost.Id, BreakdownJobStatus.Running,
            DateTimeOffset.UtcNow - TaskBreakdownJob.MaxRunTime - TimeSpan.FromMinutes(1));
        var tasksByDate = new GetTasksByDateQueryHandler(_context, new(),
            TestDbContextFactory.CreateLogger<GetTasksByDateQueryHandler>());

        // Act
        var result = await tasksByDate.Handle(new GetTasksByDateQuery
        {
            UserId = userId,
            Date = new DateOnly(2024, 11, 21),
            TimeZoneId = "Australia/Sydney"
        });

        // Assert
        result.Single(t => t.Id == running.Id).IsBreakingDown.Should().BeTrue(
            because: "the card shows 拆解中 from the server after leaving and coming back");
        result.Single(t => t.Id == lost.Id).IsBreakingDown.Should().BeFalse(
            because: "a run lost past the maximum time is reported as failed, not still running");
        result.Single(t => t.Id == idle.Id).IsBreakingDown.Should().BeFalse(
            because: "nothing is running for this task");
    }

    private async Task<(Guid UserId, int TaskId)> CreateUserWithTaskAsync()
    {
        var userId = await _seeder.CreateUserAsync();
        var start = DateTimeOffset.UtcNow;
        var task = await _seeder.CreateTaskAsync(userId, "Write report", start, start.AddHours(1));
        return (userId, task.Id);
    }

    private async Task AddJobAsync(int taskId, BreakdownJobStatus status, DateTimeOffset startedAt, string? errorCode = null)
    {
        _context.TaskBreakdownJobs.Add(new TaskBreakdownJob
        {
            TaskItemId = taskId,
            Status = status,
            StartedAtUtc = startedAt,
            UpdatedAtUtc = startedAt,
            ErrorCode = errorCode
        });
        await _context.SaveChangesAsync();
        _context.ChangeTracker.Clear();
    }
}
