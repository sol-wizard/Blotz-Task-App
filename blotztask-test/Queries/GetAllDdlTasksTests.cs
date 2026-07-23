using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Domain.Services;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.Deadlines;
using BlotzTask.Shared.Time;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Queries;

public class GetAllDdlTasksTests : IClassFixture<DatabaseFixture>
{
    private const string TimeZoneId = "Australia/Perth";
    private static readonly TimeZoneInfo PerthTimeZone = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);

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

    // Today, per the same TimeZoneClock helper the handler uses, so tests stay correct
    // regardless of which calendar day they happen to run on.
    private static DateOnly Today() => TimeZoneClock.Today(PerthTimeZone);

    // Most recent occurrence of the given weekday on or before the reference date.
    private static DateOnly MostRecentWeekday(DateOnly reference, DayOfWeek weekday)
    {
        var diff = ((int)reference.DayOfWeek - (int)weekday + 7) % 7;
        return reference.AddDays(-diff);
    }

    private static DateTimeOffset PerthTime(DateOnly date, TimeOnly time) =>
        new(date.ToDateTime(time), TimeSpan.FromHours(8));

    [Fact]
    public async Task Handle_RecurringDeadlineSeries_ReturnsCurrentVirtualOccurrenceOnly()
    {
        // Arrange
        var seriesMonday = MostRecentWeekday(Today(), DayOfWeek.Monday);

        var userId = await _seeder.CreateUserAsync();
        await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Weekly Report",
            frequency: RecurrenceFrequency.Weekly,
            startDate: seriesMonday,
            templateStartTime: PerthTime(seriesMonday, new TimeOnly(9, 0)),
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            isDeadline: true,
            deadlineOffsetDays: 2,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: TimeZoneId);

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            TimeZoneId = TimeZoneId
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
        task.RecurringOccurrence!.OccurrenceDate.Should().Be(seriesMonday,
            because: "the DDL list should show the current cycle occurrence, not the next future occurrence");
        task.DueAt.Should().Be(PerthTime(seriesMonday.AddDays(2), new TimeOnly(17, 0)),
            because: "the due time should be derived from the current occurrence date and recurring deadline template");
    }

    [Fact]
    public async Task Handle_MultipleRecurringDeadlineSeries_ReturnsOneCurrentOccurrencePerSeries()
    {
        // Arrange
        var today = Today();
        var reportMonday = MostRecentWeekday(today, DayOfWeek.Monday);
        var retroWednesday = MostRecentWeekday(today, DayOfWeek.Wednesday);

        var userId = await _seeder.CreateUserAsync();
        var report = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Weekly Report",
            frequency: RecurrenceFrequency.Weekly,
            startDate: reportMonday,
            templateStartTime: PerthTime(reportMonday, new TimeOnly(9, 0)),
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            isDeadline: true,
            deadlineOffsetDays: 2,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: TimeZoneId);
        var retro = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Team Retro",
            frequency: RecurrenceFrequency.Weekly,
            startDate: retroWednesday,
            templateStartTime: PerthTime(retroWednesday, new TimeOnly(14, 0)),
            daysOfWeek: (int)WeeklyDayFlags.Wednesday,
            isDeadline: true,
            deadlineOffsetDays: 1,
            deadlineTimeOfDay: new TimeOnly(12, 0),
            deadlineTimeZoneId: TimeZoneId);

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            TimeZoneId = TimeZoneId
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
    public async Task Handle_RecurringDeadlineSeriesWithMultipleVersions_ReturnsLatestCurrentOccurrenceForSeries()
    {
        // Arrange
        var newStart = MostRecentWeekday(Today(), DayOfWeek.Monday);
        var oldStart = newStart.AddDays(-14);
        var oldEnd = newStart.AddDays(-1);

        var userId = await _seeder.CreateUserAsync();
        var oldTemplate = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Old Weekly Report",
            frequency: RecurrenceFrequency.Weekly,
            startDate: oldStart,
            templateStartTime: PerthTime(oldStart, new TimeOnly(9, 0)),
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            endDate: oldEnd,
            isDeadline: true,
            deadlineOffsetDays: 2,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: TimeZoneId);
        var newTemplate = new RecurringTask
        {
            SeriesId = oldTemplate.SeriesId,
            PreviousRecurringTaskId = oldTemplate.Id,
            UserId = userId,
            Title = "New Weekly Report",
            TimeType = TaskTimeType.SingleTime,
            TemplateStartTime = PerthTime(newStart, new TimeOnly(10, 0)),
            ScheduleTimeZoneId = TimeZoneId,
            Pattern = new RecurrencePattern
            {
                Frequency = RecurrenceFrequency.Weekly,
                Interval = 1,
                DaysOfWeek = (int)WeeklyDayFlags.Monday
            },
            StartDate = newStart,
            IsActive = true,
            IsDeadline = true,
            DeadlineOffsetDays = 1,
            DeadlineTimeOfDay = new TimeOnly(16, 0),
            DeadlineTimeZoneId = TimeZoneId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.RecurringTasks.Add(newTemplate);
        await _context.SaveChangesAsync();

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            TimeZoneId = TimeZoneId
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        var task = result.Should().ContainSingle().Subject;
        task.Title.Should().Be("New Weekly Report",
            because: "a recurring deadline series should show the current occurrence from the active version for this cycle");
        task.RecurringOccurrence!.RecurringTaskId.Should().Be(newTemplate.Id,
            because: "the DDL item still needs the concrete recurring template version for occurrence actions");
        task.RecurringOccurrence.OccurrenceDate.Should().Be(newStart,
            because: "the series should not also show the previous version's older current occurrence");
    }

    [Fact]
    public async Task Handle_CurrentRecurringDeadlineAlreadyMaterialized_DoesNotReturnVirtualDuplicate()
    {
        // Arrange
        var seriesMonday = MostRecentWeekday(Today(), DayOfWeek.Monday);

        var userId = await _seeder.CreateUserAsync();
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Weekly Report",
            frequency: RecurrenceFrequency.Weekly,
            startDate: seriesMonday,
            templateStartTime: PerthTime(seriesMonday, new TimeOnly(9, 0)),
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            isDeadline: true,
            deadlineOffsetDays: 2,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: TimeZoneId);

        var materialized = await _seeder.CreateTaskAsync(
            userId,
            "Weekly Report",
            PerthTime(seriesMonday, new TimeOnly(9, 0)),
            PerthTime(seriesMonday, new TimeOnly(9, 0)));
        materialized.Deadline = new TaskDeadline
        {
            TaskItem = materialized,
            DueAt = PerthTime(seriesMonday.AddDays(2), new TimeOnly(17, 0)),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _context.SaveChangesAsync();
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            seriesMonday,
            RecurringOccurrenceOverrideType.Materialized,
            materialized);

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            TimeZoneId = TimeZoneId
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
        var seriesMonday = MostRecentWeekday(Today(), DayOfWeek.Monday);

        var userId = await _seeder.CreateUserAsync();
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Weekly Report",
            frequency: RecurrenceFrequency.Weekly,
            startDate: seriesMonday,
            templateStartTime: PerthTime(seriesMonday, new TimeOnly(9, 0)),
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            isDeadline: true,
            deadlineOffsetDays: 2,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: TimeZoneId);

        var detached = await _seeder.CreateTaskAsync(
            userId,
            "Final Weekly Report",
            PerthTime(seriesMonday, new TimeOnly(9, 0)),
            PerthTime(seriesMonday, new TimeOnly(9, 0)));
        detached.Deadline = new TaskDeadline
        {
            TaskItem = detached,
            DueAt = PerthTime(seriesMonday.AddDays(2), new TimeOnly(17, 0)),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _context.SaveChangesAsync();
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            seriesMonday,
            RecurringOccurrenceOverrideType.Detached,
            detached);

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            TimeZoneId = TimeZoneId
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
        var seriesMonday = MostRecentWeekday(Today(), DayOfWeek.Monday);

        var userId = await _seeder.CreateUserAsync();
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Weekly Report",
            frequency: RecurrenceFrequency.Weekly,
            startDate: seriesMonday,
            templateStartTime: PerthTime(seriesMonday, new TimeOnly(9, 0)),
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            isDeadline: true,
            deadlineOffsetDays: 2,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: TimeZoneId);

        var completed = await _seeder.CreateTaskAsync(
            userId,
            "Weekly Report",
            PerthTime(seriesMonday, new TimeOnly(9, 0)),
            PerthTime(seriesMonday, new TimeOnly(9, 0)));
        completed.IsDone = true;
        completed.Deadline = new TaskDeadline
        {
            TaskItem = completed,
            DueAt = PerthTime(seriesMonday.AddDays(2), new TimeOnly(17, 0)),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _context.SaveChangesAsync();
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            seriesMonday,
            RecurringOccurrenceOverrideType.Materialized,
            completed);

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            TimeZoneId = TimeZoneId
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
        var endDate = Today().AddDays(-2);
        var startDate = endDate.AddDays(-2);

        var userId = await _seeder.CreateUserAsync();
        await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Short Campaign",
            frequency: RecurrenceFrequency.Daily,
            startDate: startDate,
            templateStartTime: PerthTime(startDate, new TimeOnly(9, 0)),
            endDate: endDate,
            isDeadline: true,
            deadlineOffsetDays: 1,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: TimeZoneId);

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            TimeZoneId = TimeZoneId
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        var task = result.Should().ContainSingle(t => t.Title == "Short Campaign").Subject;
        task.RecurringOccurrence!.OccurrenceDate.Should().Be(endDate,
            because: "a just-ended recurring deadline series can still have its latest uncompleted occurrence due in DDL");
        task.DueAt.Should().Be(PerthTime(endDate.AddDays(1), new TimeOnly(17, 0)),
            because: "the latest ended occurrence should still use the recurring deadline template");
    }

    [Fact]
    public async Task Handle_FutureModifiedRecurringDeadlineOccurrence_DoesNotReturnBeforeItIsCurrentForSeries()
    {
        // Arrange
        var seriesMonday = MostRecentWeekday(Today(), DayOfWeek.Monday);
        var futureOccurrence = seriesMonday.AddDays(7);

        var userId = await _seeder.CreateUserAsync();
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Weekly Report",
            frequency: RecurrenceFrequency.Weekly,
            startDate: seriesMonday,
            templateStartTime: PerthTime(seriesMonday, new TimeOnly(9, 0)),
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            isDeadline: true,
            deadlineOffsetDays: 2,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: TimeZoneId);

        var futureModified = await _seeder.CreateTaskAsync(
            userId,
            "Updated Future Report",
            PerthTime(futureOccurrence, new TimeOnly(10, 0)),
            PerthTime(futureOccurrence, new TimeOnly(10, 0)));
        futureModified.Deadline = new TaskDeadline
        {
            TaskItem = futureModified,
            DueAt = PerthTime(futureOccurrence.AddDays(1), new TimeOnly(16, 0)),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _context.SaveChangesAsync();
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            futureOccurrence,
            RecurringOccurrenceOverrideType.Modified,
            futureModified);

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            TimeZoneId = TimeZoneId
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().NotContain(t => t.Title == "Updated Future Report",
            because: "a future modified recurring occurrence should wait until it becomes the series current occurrence before appearing in DDL");
        var currentTask = result.Should().ContainSingle(t => t.Title == "Weekly Report").Subject;
        currentTask.RecurringOccurrence!.OccurrenceDate.Should().Be(seriesMonday,
            because: "the earlier current occurrence should continue to be generated from the series template");
    }

    [Fact]
    public async Task Handle_CurrentModifiedRecurringDeadlineOccurrence_ReturnsModifiedTaskItemDataForSeries()
    {
        // Arrange
        var currentOccurrence = MostRecentWeekday(Today(), DayOfWeek.Monday);
        var seriesStart = currentOccurrence.AddDays(-7);

        var userId = await _seeder.CreateUserAsync();
        var recurring = await _seeder.CreateRecurringTaskAsync(
            userId,
            title: "Weekly Report",
            frequency: RecurrenceFrequency.Weekly,
            startDate: seriesStart,
            templateStartTime: PerthTime(seriesStart, new TimeOnly(9, 0)),
            daysOfWeek: (int)WeeklyDayFlags.Monday,
            isDeadline: true,
            deadlineOffsetDays: 2,
            deadlineTimeOfDay: new TimeOnly(17, 0),
            deadlineTimeZoneId: TimeZoneId);

        var modified = await _seeder.CreateTaskAsync(
            userId,
            "Updated Future Report",
            PerthTime(currentOccurrence, new TimeOnly(10, 0)),
            PerthTime(currentOccurrence, new TimeOnly(10, 0)));
        modified.Deadline = new TaskDeadline
        {
            TaskItem = modified,
            DueAt = PerthTime(currentOccurrence.AddDays(1), new TimeOnly(16, 0)),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _context.SaveChangesAsync();
        await _seeder.CreateRecurringOccurrenceOverrideAsync(
            recurring,
            currentOccurrence,
            RecurringOccurrenceOverrideType.Modified,
            modified);

        var query = new GetAllDdlTasksQuery
        {
            UserId = userId,
            TimeZoneId = TimeZoneId
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
        task.RecurringOccurrence.OccurrenceDate.Should().Be(currentOccurrence,
            because: "the current occurrence date should be the modified occurrence date");
        task.DueAt.Should().Be(PerthTime(currentOccurrence.AddDays(1), new TimeOnly(16, 0)),
            because: "the DDL row should use the modified occurrence deadline instead of the template deadline");
        result.Should().NotContain(t => t.Title == "Weekly Report",
            because: "the template virtual row should not be duplicated when a modified current series occurrence exists");
    }
}
