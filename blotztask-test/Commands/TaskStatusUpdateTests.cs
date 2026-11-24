using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Commands;

public class TaskStatusUpdateTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly TaskStatusUpdateCommandHandler _handler;

    public TaskStatusUpdateTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _handler = new TaskStatusUpdateCommandHandler(
            _context,
            TestDbContextFactory.CreateLogger<TaskStatusUpdateCommandHandler>());
    }

    [Fact]
    public async Task Handle_ExplicitIsDoneTrue_MarksTaskCompleted()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var task = await _seeder.CreateTaskAsync(
            userId,
            "Finish report",
            new DateTimeOffset(2026, 11, 14, 9, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 11, 14, 9, 0, 0, TimeSpan.Zero));

        // Act
        var result = await _handler.Handle(new TaskStatusUpdateCommand
        {
            TaskId = task.Id,
            UserId = userId,
            IsDone = true
        });

        // Assert
        result.IsDone.Should().BeTrue(because: "the client asked to mark the task done");
        var stored = await _context.TaskItems.AsNoTracking().SingleAsync(t => t.Id == task.Id);
        stored.IsDone.Should().BeTrue(because: "explicit IsDone must set the stored value, not toggle");
        stored.CompletedAt.Should().NotBeNull(because: "completing a task records CompletedAt");
    }

    [Fact]
    public async Task Handle_ExplicitIsDoneTrueWhenAlreadyDone_StaysCompleted()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var task = await _seeder.CreateTaskAsync(
            userId,
            "Already done",
            new DateTimeOffset(2026, 11, 14, 9, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 11, 14, 9, 0, 0, TimeSpan.Zero),
            completedAt: new DateTimeOffset(2026, 11, 14, 8, 0, 0, TimeSpan.Zero));

        // Act
        var result = await _handler.Handle(new TaskStatusUpdateCommand
        {
            TaskId = task.Id,
            UserId = userId,
            IsDone = true
        });

        // Assert
        result.IsDone.Should().BeTrue(
            because: "a stale client that re-sends done must not flip the task back to incomplete");
        var stored = await _context.TaskItems.AsNoTracking().SingleAsync(t => t.Id == task.Id);
        stored.IsDone.Should().BeTrue(because: "explicit IsDone true is idempotent when already done");
    }

    [Fact]
    public async Task Handle_NullIsDone_TogglesCurrentState()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var task = await _seeder.CreateTaskAsync(
            userId,
            "Legacy toggle",
            new DateTimeOffset(2026, 11, 14, 9, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 11, 14, 9, 0, 0, TimeSpan.Zero));

        // Act
        var result = await _handler.Handle(new TaskStatusUpdateCommand
        {
            TaskId = task.Id,
            UserId = userId,
            IsDone = null
        });

        // Assert
        result.IsDone.Should().BeTrue(because: "older apps with no body still toggle incomplete → complete");
    }
}
