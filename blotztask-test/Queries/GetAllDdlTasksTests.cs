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
    public async Task Handle_MultipleRecurringDeadlineSeries_ReturnsOneCurrentOccurrencePerSeries()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var report = await _seeder.CreateRecurringTaskAsync(
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
        var retro = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Team Retro",
            frequency: RecurrenceFrequency.Weekly,
            startDate: new DateOnly(2026, 6, 10),
            templateStartTime: new DateTimeOffset(2026, 6, 10, 14, 0, 0, TimeSpan.FromHours(8)),
            daysOfWeek: (int)WeeklyDayFlags.Wednesday,
            isDeadline: true,
            deadlineOffsetDays: 1,
            deadlineTimeOfDay: new TimeOnly(12, 0),
            deadlineTimeZoneId: "Australia/Perth");

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            Now = new DateTimeOffset(2026, 6, 12, 9, 0, 0, TimeSpan.FromHours(8))
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().HaveCount(2,
            because: "each eligible recurring deadline series should contribute one current DDL occurrence");
        result.Select(t => t.RecurringOccurrence?.RecurringTaskId)
            .Should()
            .BeEquivalentTo([report.Id, retro.Id],
                because: "different recurring deadline series should not be collapsed into a single DDL item");
        result.Should().OnlyContain(t => t.Id == null && t.OccurrenceKind == TaskOccurrenceKind.VirtualRecurringOccurrence,
            because: "unmodified current recurring deadline occurrences should remain virtual until the user acts on them");
    }

    [Fact]
    public async Task Handle_RecurringDeadlineSeriesWithMultipleVersions_ReturnsCurrentOccurrenceForEachTemplateVersion()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var oldTemplate = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Old Weekly Report",
            frequency: RecurrenceFrequency.Weekly,
            startDate: new DateOnly(2026, 6, 1),
            templateStartTime: new DateTimeOffset(2026, 6, 1, 9, 0, 0, TimeSpan.FromHours(8)),
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            endDate: new DateOnly(2026, 6, 14),
            isDeadline: true,
            deadlineOffsetDays: 2,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: "Australia/Perth");
        var newTemplate = new RecurringTask
        {
            SeriesId = oldTemplate.SeriesId,
            PreviousRecurringTaskId = oldTemplate.Id,
            UserId = userId,
            Title = "New Weekly Report",
            TimeType = TaskTimeType.SingleTime,
            TemplateStartTime = new DateTimeOffset(2026, 6, 15, 10, 0, 0, TimeSpan.FromHours(8)),
            ScheduleTimeZoneId = "Australia/Perth",
            Pattern = new RecurrencePattern
            {
                Frequency = RecurrenceFrequency.Weekly,
                Interval = 1,
                DaysOfWeek = (int)WeeklyDayFlags.Monday
            },
            StartDate = new DateOnly(2026, 6, 15),
            IsActive = true,
            IsDeadline = true,
            DeadlineOffsetDays = 1,
            DeadlineTimeOfDay = new TimeOnly(16, 0),
            DeadlineTimeZoneId = "Australia/Perth",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.RecurringTasks.Add(newTemplate);
        await _context.SaveChangesAsync();

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            Now = new DateTimeOffset(2026, 6, 18, 9, 0, 0, TimeSpan.FromHours(8))
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().HaveCount(2,
            because: "same-series recurring deadline template versions can each contribute their current DDL occurrence");
        result.Select(t => t.RecurringOccurrence?.RecurringTaskId)
            .Should()
            .BeEquivalentTo([oldTemplate.Id, newTemplate.Id],
                because: "recurring deadline occurrence identity is the concrete recurring template plus occurrence date, not the series");
        result.Select(t => t.RecurringOccurrence?.OccurrenceDate)
            .Should()
            .BeEquivalentTo([new DateOnly(2026, 6, 8), new DateOnly(2026, 6, 15)],
                because: "each recurring template version should keep its own current occurrence date");
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
        materialized.Deadline = new TaskDeadline
        {
            TaskItem = materialized,
            DueAt = new DateTimeOffset(2026, 6, 10, 17, 0, 0, TimeSpan.FromHours(8)),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _context.SaveChangesAsync();
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 8),
            RecurringOccurrenceOverrideType.Materialized,
            materialized);

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
    public async Task Handle_DetachedRecurringDeadlineOccurrence_ReturnsAsNormalDeadlineTask()
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

        var detached = await _seeder.CreateTaskAsync(
            userId,
            "Final Weekly Report",
            new DateTimeOffset(2026, 6, 8, 9, 0, 0, TimeSpan.FromHours(8)),
            new DateTimeOffset(2026, 6, 8, 9, 0, 0, TimeSpan.FromHours(8)));
        detached.Deadline = new TaskDeadline
        {
            TaskItem = detached,
            DueAt = new DateTimeOffset(2026, 6, 10, 17, 0, 0, TimeSpan.FromHours(8)),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _context.SaveChangesAsync();
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 8),
            RecurringOccurrenceOverrideType.Detached,
            detached);

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            Now = new DateTimeOffset(2026, 6, 12, 9, 0, 0, TimeSpan.FromHours(8))
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        var task = result.Should().ContainSingle(t => t.Title == "Final Weekly Report").Subject;
        task.Id.Should().Be(detached.Id,
            because: "a detached recurring deadline occurrence should remain visible as its concrete TaskItem");
        task.OccurrenceKind.Should().Be(TaskOccurrenceKind.NormalTaskItem,
            because: "detached occurrences should no longer expose recurring occurrence actions in DDL");
        task.RecurringOccurrence.Should().BeNull(
            because: "the mobile app should treat detached recurring deadline occurrences as normal deadline tasks");
        result.Should().NotContain(t => t.Title == "Weekly Report",
            because: "the detached override should suppress the virtual recurring deadline row for the same occurrence");
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
        completed.IsDone = true;
        completed.Deadline = new TaskDeadline
        {
            TaskItem = completed,
            DueAt = new DateTimeOffset(2026, 6, 10, 17, 0, 0, TimeSpan.FromHours(8)),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _context.SaveChangesAsync();
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 8),
            RecurringOccurrenceOverrideType.Materialized,
            completed);

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

    [Fact]
    public async Task Handle_FutureModifiedRecurringDeadlineOccurrence_DoesNotReturnBeforeItIsCurrentForSeries()
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

        var futureModified = await _seeder.CreateTaskAsync(
            userId,
            "Updated Future Report",
            new DateTimeOffset(2026, 6, 15, 10, 0, 0, TimeSpan.FromHours(8)),
            new DateTimeOffset(2026, 6, 15, 10, 0, 0, TimeSpan.FromHours(8)));
        futureModified.Deadline = new TaskDeadline
        {
            TaskItem = futureModified,
            DueAt = new DateTimeOffset(2026, 6, 16, 16, 0, 0, TimeSpan.FromHours(8)),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _context.SaveChangesAsync();
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 15),
            RecurringOccurrenceOverrideType.Modified,
            futureModified);

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            Now = new DateTimeOffset(2026, 6, 12, 9, 0, 0, TimeSpan.FromHours(8))
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().NotContain(t => t.Title == "Updated Future Report",
            because: "a future modified recurring occurrence should wait until it becomes the series current occurrence before appearing in DDL");
        var currentTask = result.Should().ContainSingle(t => t.Title == "Weekly Report").Subject;
        currentTask.RecurringOccurrence!.OccurrenceDate.Should().Be(new DateOnly(2026, 6, 8),
            because: "the earlier current occurrence should continue to be generated from the series template");
    }

    [Fact]
    public async Task Handle_CurrentModifiedRecurringDeadlineOccurrence_ReturnsModifiedTaskItemDataForSeries()
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

        var modified = await _seeder.CreateTaskAsync(
            userId,
            "Updated Future Report",
            new DateTimeOffset(2026, 6, 15, 10, 0, 0, TimeSpan.FromHours(8)),
            new DateTimeOffset(2026, 6, 15, 10, 0, 0, TimeSpan.FromHours(8)));
        modified.Deadline = new TaskDeadline
        {
            TaskItem = modified,
            DueAt = new DateTimeOffset(2026, 6, 16, 16, 0, 0, TimeSpan.FromHours(8)),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _context.SaveChangesAsync();
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            new DateOnly(2026, 6, 15),
            RecurringOccurrenceOverrideType.Modified,
            modified);

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            Now = new DateTimeOffset(2026, 6, 18, 9, 0, 0, TimeSpan.FromHours(8))
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        var task = result.Should().ContainSingle(t => t.Title == "Updated Future Report").Subject;
        task.Id.Should().Be(modified.Id,
            because: "the modified current occurrence should be returned as its materialized TaskItem");
        task.OccurrenceKind.Should().Be(TaskOccurrenceKind.MaterializedRecurringOccurrence,
            because: "modified occurrence data comes from a persisted recurring occurrence TaskItem");
        task.RecurringOccurrence!.RecurringTaskId.Should().Be(recurring.Id,
            because: "the modified DDL item should preserve the recurring template version for occurrence actions");
        task.RecurringOccurrence.OccurrenceDate.Should().Be(new DateOnly(2026, 6, 15),
            because: "the current occurrence date should be the modified occurrence date");
        task.DueAt.Should().Be(new DateTimeOffset(2026, 6, 16, 16, 0, 0, TimeSpan.FromHours(8)),
            because: "the DDL row should use the modified occurrence deadline instead of the template deadline");
        result.Should().NotContain(t => t.Title == "Weekly Report",
            because: "the template virtual row should not be duplicated when a modified current series occurrence exists");
    }
}
