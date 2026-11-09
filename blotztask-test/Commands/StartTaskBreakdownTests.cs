using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Exceptions;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Modules.BreakDown.Commands;
using BlotzTask.Modules.BreakDown.Domain;
using BlotzTask.Modules.BreakDown.Enums;
using BlotzTask.Shared.Exceptions;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace BlotzTask.Tests.Commands;

public class StartTaskBreakdownTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly StartTaskBreakdownCommandHandler _handler;

    public StartTaskBreakdownTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _handler = new StartTaskBreakdownCommandHandler(
            _context,
            new CheckAiQuotaService(_context, new MemoryCache(new MemoryCacheOptions())),
            TestDbContextFactory.CreateLogger<StartTaskBreakdownCommandHandler>());
    }

    [Fact]
    public async Task Handle_NoJobYet_CreatesRunningJob()
    {
        // Arrange
        var (userId, taskId) = await CreateUserWithTaskAsync();

        // Act
        var result = await _handler.Handle(new StartTaskBreakdownCommand { TaskItemId = taskId, UserId = userId });

        // Assert
        result.Started.Should().BeTrue(because: "nothing was running for this task");
        var job = await _context.TaskBreakdownJobs.AsNoTracking().SingleAsync(j => j.TaskItemId == taskId);
        job.Status.Should().Be(BreakdownJobStatus.Running, because: "the run is queued right after the start");
    }

    [Fact]
    public async Task Handle_AlreadyRunning_DoesNotStartSecondRun()
    {
        // Arrange
        var (userId, taskId) = await CreateUserWithTaskAsync();
        var command = new StartTaskBreakdownCommand { TaskItemId = taskId, UserId = userId };
        await _handler.Handle(command);

        // Act
        var result = await _handler.Handle(command);

        // Assert
        result.Started.Should().BeFalse(because: "tapping breakdown twice must start only one run");
        (await _context.TaskBreakdownJobs.CountAsync(j => j.TaskItemId == taskId))
            .Should().Be(1, because: "a task has at most one job row");
    }

    [Fact]
    public async Task Handle_RunningPastMaxRunTime_StartsAgain()
    {
        // Arrange
        var (userId, taskId) = await CreateUserWithTaskAsync();
        var lostStart = DateTimeOffset.UtcNow - TaskBreakdownJob.MaxRunTime - TimeSpan.FromMinutes(1);
        await AddJobAsync(taskId, BreakdownJobStatus.Running, lostStart);

        // Act
        var result = await _handler.Handle(new StartTaskBreakdownCommand { TaskItemId = taskId, UserId = userId });

        // Assert
        result.Started.Should().BeTrue(because: "a run stuck past the maximum time was lost, e.g. by a restart");
        var job = await _context.TaskBreakdownJobs.AsNoTracking().SingleAsync(j => j.TaskItemId == taskId);
        job.StartedAtUtc.Should().BeAfter(lostStart, because: "the retry is a new run with a new start time");
    }

    [Fact]
    public async Task Handle_PreviousRunFailed_StartsAgainAndClearsError()
    {
        // Arrange
        var (userId, taskId) = await CreateUserWithTaskAsync();
        await AddJobAsync(taskId, BreakdownJobStatus.Failed, DateTimeOffset.UtcNow, errorCode: "Unknown");

        // Act
        var result = await _handler.Handle(new StartTaskBreakdownCommand { TaskItemId = taskId, UserId = userId });

        // Assert
        result.Started.Should().BeTrue(because: "retry after a failure starts a new run");
        var job = await _context.TaskBreakdownJobs.AsNoTracking().SingleAsync(j => j.TaskItemId == taskId);
        job.Status.Should().Be(BreakdownJobStatus.Running, because: "the row is reused for the new run");
        job.ErrorCode.Should().BeNull(because: "the old failure no longer applies");
    }

    [Fact]
    public async Task Handle_OutOfQuota_ThrowsAndCreatesNoJob()
    {
        // Arrange
        var (userId, taskId) = await CreateUserWithTaskAsync(monthlyTokenLimit: 100);
        await _seeder.CreateAiUsageRecordAsync(userId, 50, 50, 100);

        // Act
        var act = () => _handler.Handle(new StartTaskBreakdownCommand { TaskItemId = taskId, UserId = userId });

        // Assert
        await act.Should().ThrowAsync<AiQuotaExceededException>(
            because: "the user gets the real reason at once instead of a run that can only fail");
        (await _context.TaskBreakdownJobs.AnyAsync(j => j.TaskItemId == taskId))
            .Should().BeFalse(because: "no run is started without quota");
    }

    [Fact]
    public async Task Handle_TaskOwnedByDifferentUser_ThrowsNotFoundException()
    {
        // Arrange
        var (_, taskId) = await CreateUserWithTaskAsync();
        var (otherUserId, _) = await CreateUserWithTaskAsync();

        // Act
        var act = () => _handler.Handle(new StartTaskBreakdownCommand { TaskItemId = taskId, UserId = otherUserId });

        // Assert
        await act.Should().ThrowAsync<NotFoundException>(because: "users can only break down their own tasks");
    }

    private async Task<(Guid UserId, int TaskId)> CreateUserWithTaskAsync(int monthlyTokenLimit = 100_000)
    {
        var userId = await _seeder.CreateUserAsync();
        var plan = await _seeder.CreateSubscriptionPlanAsync($"plan-{userId}", monthlyTokenLimit);
        await _seeder.CreateUserSubscriptionAsync(userId, plan.Id);
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
