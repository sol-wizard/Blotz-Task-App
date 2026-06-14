using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Shared.Exceptions;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Commands;

public class DeleteTaskTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly DeleteTaskCommandHandler _handler;

    public DeleteTaskTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _handler = new DeleteTaskCommandHandler(
            _context,
            TestDbContextFactory.CreateLogger<DeleteTaskCommandHandler>());
    }

    [Fact]
    public async Task Handle_NormalTask_DeletesTaskAndArchivesDeletedTask()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var task = await _seeder.CreateTaskAsync(
            userId,
            "Normal task",
            new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 1, 10, 0, 0, TimeSpan.Zero));

        // Act
        var result = await _handler.Handle(new DeleteTaskCommand
        {
            TaskId = task.Id,
            UserId = userId
        }, CancellationToken.None);

        var taskStillExists = await _context.TaskItems.AnyAsync(t => t.Id == task.Id);
        var deletedTask = await _context.DeletedTaskItems.SingleAsync(t => t.Id == task.Id);

        // Assert
        result.Should().Be("Task deleted successfully.",
            because: "the delete command should keep its existing response contract");
        taskStillExists.Should().BeFalse(
            because: "normal tasks should still be physically removed from TaskItems");
        deletedTask.Title.Should().Be("Normal task",
            because: "deleted tasks should keep an archive copy with the original task data");
        deletedTask.UserId.Should().Be(userId,
            because: "the archive copy should remain owned by the same user");
    }

    [Fact]
    public async Task Handle_MaterializedRecurringOccurrence_MarksOverrideSkipped()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var occurrenceDate = new DateOnly(2026, 6, 3);
        var occurrenceTime = new DateTimeOffset(2026, 6, 3, 9, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            "Daily review",
            RecurrenceFrequency.Daily,
            new DateOnly(2026, 6, 1),
            occurrenceTime);
        var task = await _seeder.CreateTaskAsync(userId, "Daily review", occurrenceTime, occurrenceTime);
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            occurrenceDate,
            RecurringOccurrenceOverrideType.Materialized,
            task);

        // Act
        await _handler.Handle(new DeleteTaskCommand
        {
            TaskId = task.Id,
            UserId = userId
        }, CancellationToken.None);

        var taskStillExists = await _context.TaskItems.AnyAsync(t => t.Id == task.Id);
        var deletedTaskStillExists = await _context.DeletedTaskItems.AnyAsync(t => t.Id == task.Id);
        var recurringOverride = await _context.RecurringOccurrenceOverrides
            .SingleAsync(o => o.SeriesId == recurring.SeriesId && o.OccurrenceDate == occurrenceDate);

        // Assert
        taskStillExists.Should().BeFalse(
            because: "deleting a materialized recurring occurrence should remove the concrete task item");
        deletedTaskStillExists.Should().BeTrue(
            because: "deleting a materialized recurring occurrence should still archive the concrete task item");
        recurringOverride.OverrideType.Should().Be(RecurringOccurrenceOverrideType.Skipped,
            because: "the recurring date should remain suppressed after the concrete task item is deleted");
        recurringOverride.TaskItem.Should().BeNull(
            because: "a skipped recurring occurrence should not retain a concrete task item");
    }

    [Fact]
    public async Task Handle_ModifiedRecurringOccurrence_MarksOverrideSkipped()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var occurrenceDate = new DateOnly(2026, 6, 4);
        var occurrenceTime = new DateTimeOffset(2026, 6, 4, 11, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            "Daily focus",
            RecurrenceFrequency.Daily,
            new DateOnly(2026, 6, 1),
            occurrenceTime);
        var task = await _seeder.CreateTaskAsync(userId, "Modified daily focus", occurrenceTime, occurrenceTime);
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            occurrenceDate,
            RecurringOccurrenceOverrideType.Modified,
            task);

        // Act
        await _handler.Handle(new DeleteTaskCommand
        {
            TaskId = task.Id,
            UserId = userId
        }, CancellationToken.None);

        var taskStillExists = await _context.TaskItems.AnyAsync(t => t.Id == task.Id);
        var deletedTaskStillExists = await _context.DeletedTaskItems.AnyAsync(t => t.Id == task.Id);
        var recurringOverride = await _context.RecurringOccurrenceOverrides
            .SingleAsync(o => o.SeriesId == recurring.SeriesId && o.OccurrenceDate == occurrenceDate);

        // Assert
        taskStillExists.Should().BeFalse(
            because: "deleting a modified recurring occurrence should remove the concrete task item");
        deletedTaskStillExists.Should().BeTrue(
            because: "deleted modified recurring occurrences should keep the normal deleted-task archive");
        recurringOverride.OverrideType.Should().Be(RecurringOccurrenceOverrideType.Skipped,
            because: "deleting a modified recurring occurrence should convert the user override into a skipped date");
        recurringOverride.TaskItem.Should().BeNull(
            because: "a skipped occurrence should no longer point at a deleted task item");
    }

    [Fact]
    public async Task Handle_DetachedRecurringOccurrence_RemovesDetachedOverride()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var occurrenceDate = new DateOnly(2026, 6, 5);
        var occurrenceTime = new DateTimeOffset(2026, 6, 5, 12, 0, 0, TimeSpan.Zero);
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            "Daily standup",
            RecurrenceFrequency.Daily,
            new DateOnly(2026, 6, 1),
            occurrenceTime);
        var task = await _seeder.CreateTaskAsync(userId, "Detached standup", occurrenceTime, occurrenceTime);
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            occurrenceDate,
            RecurringOccurrenceOverrideType.Detached,
            task);

        // Act
        await _handler.Handle(new DeleteTaskCommand
        {
            TaskId = task.Id,
            UserId = userId
        }, CancellationToken.None);

        var taskStillExists = await _context.TaskItems.AnyAsync(t => t.Id == task.Id);
        var deletedTaskStillExists = await _context.DeletedTaskItems.AnyAsync(t => t.Id == task.Id);
        var detachedOverrideStillExists = await _context.RecurringOccurrenceOverrides
            .AnyAsync(o => o.SeriesId == recurring.SeriesId && o.OccurrenceDate == occurrenceDate);

        // Assert
        taskStillExists.Should().BeFalse(
            because: "detached occurrences are deleted as concrete tasks");
        deletedTaskStillExists.Should().BeTrue(
            because: "deleted detached occurrences should keep the normal deleted-task archive");
        detachedOverrideStillExists.Should().BeFalse(
            because: "a detached override without its concrete task item has no remaining recurring state to preserve");
    }

    [Fact]
    public async Task Handle_TaskOwnedByDifferentUser_ThrowsNotFoundException()
    {
        // Arrange
        var ownerUserId = await _seeder.CreateUserAsync();
        var otherUserId = await _seeder.CreateUserAsync();
        var task = await _seeder.CreateTaskAsync(
            ownerUserId,
            "Private task",
            new DateTimeOffset(2026, 6, 6, 9, 0, 0, TimeSpan.Zero),
            new DateTimeOffset(2026, 6, 6, 9, 30, 0, TimeSpan.Zero));

        // Act
        var act = async () => await _handler.Handle(new DeleteTaskCommand
        {
            TaskId = task.Id,
            UserId = otherUserId
        }, CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<NotFoundException>(
            because: "delete should only find tasks owned by the requesting user");
        var taskStillExists = await _context.TaskItems.AnyAsync(t => t.Id == task.Id);
        taskStillExists.Should().BeTrue(
            because: "a user should not be able to delete another user's task");
    }
}
