using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.Deadlines;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Queries;

public class GetAllDdlTasksTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly GetAllDdlTasksQueryHandler _handler;
    private readonly DataSeeder _seeder;

    public GetAllDdlTasksTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        var logger = TestDbContextFactory.CreateLogger<GetAllDdlTasksQueryHandler>();
        _handler = new GetAllDdlTasksQueryHandler(_context, new RecurringTaskGeneratorService(), logger);
    }

    [Fact]
    public async Task Handle_RecurringDeadlineSeries_ReturnsCurrentVirtualOccurrenceOnly()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Weekly Report",
            frequency: RecurrenceFrequency.Weekly,
            startDate: new DateOnly(2026, 6, 8),
            templateStartTime: new DateTimeOffset(2026, 6, 8, 9, 0, 0, TimeSpan.FromHours(8)),
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            isDeadline: true,
            deadlineOffsetDays: 2,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: "Australia/Perth");

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            Now = new DateTimeOffset(2026, 6, 12, 9, 0, 0, TimeSpan.FromHours(8))
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        var task = result.Should().ContainSingle(t => t.Title == "Weekly Report").Subject;
        task.Id.Should().BeNull(because: "unmaterialized recurring deadline occurrences should remain virtual in the DDL list");
        task.OccurrenceKind.Should().Be(TaskOccurrenceKind.VirtualRecurringOccurrence,
            because: "the DDL list should expose occurrence identity for virtual recurring deadlines");
        task.RecurringOccurrence.Should().NotBeNull(
            because: "the mobile app needs the recurring identity to complete or materialize the virtual DDL item");
        task.RecurringOccurrence!.OccurrenceDate.Should().Be(new DateOnly(2026, 6, 8),
            because: "the DDL list should show the current cycle occurrence, not the next future occurrence");
        task.DueAt.Should().Be(new DateTimeOffset(2026, 6, 10, 17, 0, 0, TimeSpan.FromHours(8)),
            because: "the due time should be derived from the current occurrence date and recurring deadline template");
    }

    [Fact]
    public async Task Handle_CurrentRecurringDeadlineAlreadyMaterialized_DoesNotReturnVirtualDuplicate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Weekly Report",
            frequency: RecurrenceFrequency.Weekly,
            startDate: new DateOnly(2026, 6, 8),
            templateStartTime: new DateTimeOffset(2026, 6, 8, 9, 0, 0, TimeSpan.FromHours(8)),
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            isDeadline: true,
            deadlineOffsetDays: 2,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: "Australia/Perth");

        var materialized = await _seeder.CreateTaskAsync(
            userId,
            "Weekly Report",
            new DateTimeOffset(2026, 6, 8, 9, 0, 0, TimeSpan.FromHours(8)),
            new DateTimeOffset(2026, 6, 8, 9, 0, 0, TimeSpan.FromHours(8)));
        materialized.RecurringTaskId = recurring.Id;
        materialized.RecurringOccurrenceDate = new DateOnly(2026, 6, 8);
        materialized.Deadline = new TaskDeadline
        {
            TaskItem = materialized,
            DueAt = new DateTimeOffset(2026, 6, 10, 17, 0, 0, TimeSpan.FromHours(8)),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _context.SaveChangesAsync();

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            Now = new DateTimeOffset(2026, 6, 12, 9, 0, 0, TimeSpan.FromHours(8))
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        var reportTasks = result.Where(t => t.Title == "Weekly Report").ToList();
        reportTasks.Should().HaveCount(1,
            because: "a materialized recurring deadline occurrence should replace the virtual DDL occurrence for the same cycle");
        reportTasks[0].Id.Should().Be(materialized.Id,
            because: "the concrete DDL row should be returned when the current occurrence already exists");
        reportTasks[0].OccurrenceKind.Should().Be(TaskOccurrenceKind.MaterializedRecurringOccurrence,
            because: "the concrete row still needs to be identified as a materialized recurring occurrence");
    }

    [Fact]
    public async Task Handle_CurrentRecurringDeadlineAlreadyCompleted_DoesNotReturnVirtualDuplicate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Weekly Report",
            frequency: RecurrenceFrequency.Weekly,
            startDate: new DateOnly(2026, 6, 8),
            templateStartTime: new DateTimeOffset(2026, 6, 8, 9, 0, 0, TimeSpan.FromHours(8)),
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            isDeadline: true,
            deadlineOffsetDays: 2,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: "Australia/Perth");

        var completed = await _seeder.CreateTaskAsync(
            userId,
            "Weekly Report",
            new DateTimeOffset(2026, 6, 8, 9, 0, 0, TimeSpan.FromHours(8)),
            new DateTimeOffset(2026, 6, 8, 9, 0, 0, TimeSpan.FromHours(8)));
        completed.RecurringTaskId = recurring.Id;
        completed.RecurringOccurrenceDate = new DateOnly(2026, 6, 8);
        completed.IsDone = true;
        completed.Deadline = new TaskDeadline
        {
            TaskItem = completed,
            DueAt = new DateTimeOffset(2026, 6, 10, 17, 0, 0, TimeSpan.FromHours(8)),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _context.SaveChangesAsync();

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            Now = new DateTimeOffset(2026, 6, 12, 9, 0, 0, TimeSpan.FromHours(8))
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().NotContain(t => t.Title == "Weekly Report",
            because: "completed materialized occurrences should suppress the current virtual DDL occurrence until the next cycle starts");
    }

    [Fact]
    public async Task Handle_RecurringDeadlineSeriesEndedBeforeToday_ReturnsLatestCurrentOccurrence()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Short Campaign",
            frequency: RecurrenceFrequency.Daily,
            startDate: new DateOnly(2026, 6, 8),
            templateStartTime: new DateTimeOffset(2026, 6, 8, 9, 0, 0, TimeSpan.FromHours(8)),
            endDate: new DateOnly(2026, 6, 10),
            isDeadline: true,
            deadlineOffsetDays: 1,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: "Australia/Perth");

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            Now = new DateTimeOffset(2026, 6, 12, 9, 0, 0, TimeSpan.FromHours(8))
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        var task = result.Should().ContainSingle(t => t.Title == "Short Campaign").Subject;
        task.RecurringOccurrence!.OccurrenceDate.Should().Be(new DateOnly(2026, 6, 10),
            because: "a just-ended recurring deadline series can still have its latest uncompleted occurrence due in DDL");
        task.DueAt.Should().Be(new DateTimeOffset(2026, 6, 11, 17, 0, 0, TimeSpan.FromHours(8)),
            because: "the latest ended occurrence should still use the recurring deadline template");
    }
}
