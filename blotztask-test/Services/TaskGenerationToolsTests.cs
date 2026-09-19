using System.ComponentModel.DataAnnotations;
using BlotzTask.Modules.ChatTaskGenerator.Functions;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.Tasks.Enums;
using FluentAssertions;

namespace BlotzTask.Tests.Services;

public class TaskGenerationToolsTests
{
    [Fact]
    public async Task Handle_CreateMultipleRecurringActions_CreatesOneDraftPerAction()
    {
        // Arrange
        var tools = new TaskGenerationTools();
        var inputs = new[]
        {
            DailyInput("Do laundry", 15),
            DailyInput("Dry clothes", 16),
            DailyInput("Buy dinner", 19)
        };

        // Act
        var result = await tools.CreateRecurringTasks(inputs);

        // Assert
        result.Should().Be("3 recurring task(s) added.",
            because: "every independently completable recurring action needs its own draft");
        tools.RecurringTasks.Select(task => task.Title).Should().Equal(
            ["Do laundry", "Dry clothes", "Buy dinner"],
            because: "the batch tool must preserve every action and its original order");
        tools.RecurringTasks.Should().OnlyContain(task => task.Frequency == RecurrenceFrequency.Daily,
            because: "the shared daily cadence applies to all three actions");

        static RecurringTaskInput DailyInput(string title, int hour) => new()
        {
            Title = title,
            Description = "",
            TimeType = TaskTimeType.RangeTime,
            Label = LabelNameEnum.Life,
            TemplateStartTime = new DateTime(2026, 8, 9, hour, 0, 0),
            TemplateEndTime = new DateTime(2026, 8, 9, hour + 1, 0, 0),
            Frequency = RecurrenceFrequency.Daily
        };
    }

    [Fact]
    public async Task Handle_UpdateRecurringWeekday_ChangesOnlyDaysOfWeek()
    {
        // Arrange
        var tools = new TaskGenerationTools();
        await tools.CreateRecurringTask(
            "Gym", "Strength session", TaskTimeType.RangeTime, LabelNameEnum.Health,
            new DateTime(2026, 8, 10, 7, 0, 0), new DateTime(2026, 8, 10, 8, 0, 0),
            RecurrenceFrequency.Weekly, 1, [DayOfWeek.Monday], null,
            new DateOnly(2027, 12, 31));
        var original = tools.RecurringTasks.Single();
        var originalId = original.Id;
        var expectedUnchanged = new
        {
            original.Title,
            original.Description,
            original.TimeType,
            original.LabelName,
            original.TemplateStartTime,
            original.TemplateEndTime,
            original.Frequency,
            original.Interval,
            original.DayOfMonth,
            original.StartDate,
            original.EndDate
        };

        // Act
        var result = tools.UpdateRecurringTask("Gym", daysOfWeek: [DayOfWeek.Tuesday]);

        // Assert
        result.Should().Be("Recurring task updated.", because: "the recurring draft exists");
        var updated = tools.RecurringTasks.Single();
        updated.Id.Should().Be(originalId, because: "an update must mutate the existing draft");
        updated.DaysOfWeek.Should().Be((int)WeeklyDayFlags.Tuesday, because: "Tuesday was the only requested change");
        updated.Should().BeEquivalentTo(expectedUnchanged, options => options.ExcludingMissingMembers(),
            because: "partial updates must preserve every omitted field");
    }

    [Fact]
    public async Task Handle_UpdateRecurringWithEmptyWeekdays_PreservesExistingWeekdays()
    {
        // Arrange
        var tools = new TaskGenerationTools();
        await tools.CreateRecurringTask(
            "Gym", "Strength session", TaskTimeType.RangeTime, LabelNameEnum.Health,
            new DateTime(2026, 8, 10, 7, 0, 0), new DateTime(2026, 8, 10, 8, 0, 0),
            RecurrenceFrequency.Weekly, 1,
            [DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Friday], null, null);

        // Act
        var result = tools.UpdateRecurringTask("Gym", title: "Fitness", daysOfWeek: []);

        // Assert
        result.Should().Be("Recurring task updated.", because: "the recurring draft exists");
        var updated = tools.RecurringTasks.Single();
        updated.Title.Should().Be("Fitness", because: "the requested title change should still apply");
        updated.DaysOfWeek.Should().Be(
            (int)(WeeklyDayFlags.Monday | WeeklyDayFlags.Wednesday | WeeklyDayFlags.Friday),
            because: "an empty array from the model means weekdays were omitted, not cleared");
    }

    [Fact]
    public async Task Handle_RemoveRecurringTask_PreservesSameTitledOneOffTask()
    {
        // Arrange
        var tools = new TaskGenerationTools();
        await tools.CreateTask("Weekly standup", "One-off", new DateTime(2026, 8, 8, 15, 0, 0),
            new DateTime(2026, 8, 8, 15, 30, 0), LabelNameEnum.Work);
        await tools.CreateRecurringTask(
            "Weekly standup", "Recurring", TaskTimeType.RangeTime, LabelNameEnum.Work,
            new DateTime(2026, 8, 10, 9, 0, 0), new DateTime(2026, 8, 10, 9, 30, 0),
            RecurrenceFrequency.Weekly, 1, [DayOfWeek.Monday], null,
            null);

        // Act
        var result = tools.RemoveRecurringTask("Weekly standup");

        // Assert
        result.Should().Be("Recurring task removed.", because: "the recurring draft matches the title");
        tools.RecurringTasks.Should().BeEmpty(because: "the recurring draft was removed");
        tools.Tasks.Should().ContainSingle(task => task.Title == "Weekly standup",
            because: "recurring removal must never touch the one-off task list");
    }

    [Fact]
    public async Task Handle_UpdateRecurringFrequency_NormalizesEndpointCoupledFields()
    {
        // Arrange
        var tools = new TaskGenerationTools();
        await tools.CreateRecurringTask(
            "Gym", "", TaskTimeType.SingleTime, LabelNameEnum.Health,
            new DateTime(2026, 8, 10, 7, 0, 0), new DateTime(2026, 8, 10, 7, 0, 0),
            RecurrenceFrequency.Weekly, 0, [], null,
            null);

        // Act
        tools.UpdateRecurringTask("Gym", frequency: RecurrenceFrequency.Monthly);

        // Assert
        var updated = tools.RecurringTasks.Single();
        updated.Interval.Should().Be(1, because: "the recurring endpoint rejects intervals below one");
        updated.DaysOfWeek.Should().BeNull(because: "daysOfWeek is valid only for weekly patterns");
        updated.DayOfMonth.Should().Be(10, because: "monthly patterns need a day derived from the template start");
        updated.StartDate.Should().Be(new DateOnly(2026, 8, 10),
            because: "startDate must match the template start date");
    }

    [Fact]
    public async Task Handle_ClearRecurringEndDate_MakesDraftOpenEnded()
    {
        // Arrange
        var tools = new TaskGenerationTools();
        await tools.CreateRecurringTask(
            "Gym", "", TaskTimeType.SingleTime, LabelNameEnum.Health,
            new DateTime(2026, 8, 11, 7, 0, 0), new DateTime(2026, 8, 11, 7, 0, 0),
            RecurrenceFrequency.Weekly, 1, [DayOfWeek.Tuesday], null,
            new DateOnly(2027, 12, 31));

        // Act
        tools.UpdateRecurringTask("Gym", clearEndDate: true);

        // Assert
        tools.RecurringTasks.Single().EndDate.Should().BeNull(
            because: "clearEndDate explicitly distinguishes clearing from leaving the date unchanged");
    }

    [Fact]
    public async Task Handle_UpdateRecurringSingleTimeToRangeTime_ChangesTimeTypeAndEndTime()
    {
        // Arrange
        var tools = new TaskGenerationTools();
        var start = new DateTime(2026, 8, 11, 7, 0, 0);
        var end = new DateTime(2026, 8, 11, 8, 0, 0);
        await tools.CreateRecurringTask(
            "Gym", "", TaskTimeType.SingleTime, LabelNameEnum.Health,
            start, start, RecurrenceFrequency.Weekly, 1, [DayOfWeek.Tuesday], null, null);

        // Act
        var result = tools.UpdateRecurringTask(
            "Gym", timeType: TaskTimeType.RangeTime, templateEndTime: end);

        // Assert
        result.Should().Be("Recurring task updated.", because: "the recurring draft exists");
        var updated = tools.RecurringTasks.Single();
        updated.TimeType.Should().Be(TaskTimeType.RangeTime,
            because: "the user changed the task from a moment to a duration");
        updated.TemplateStartTime.Should().Be(start,
            because: "the user did not ask to change the start time");
        updated.TemplateEndTime.Should().Be(end,
            because: "the supplied end time defines the new duration");
    }

    [Fact]
    public async Task Handle_UpdateRecurringWithEndDateBeforeStartDate_RejectsUpdateWithoutChangingDraft()
    {
        // Arrange
        var tools = new TaskGenerationTools();
        var start = new DateTime(2026, 8, 11, 7, 0, 0);
        await tools.CreateRecurringTask(
            "Gym", "", TaskTimeType.SingleTime, LabelNameEnum.Health,
            start, start, RecurrenceFrequency.Weekly, 1, [DayOfWeek.Tuesday], null, null);

        // Act
        var act = () => tools.UpdateRecurringTask(
            "Gym", title: "Morning gym", endDate: new DateOnly(2026, 8, 10));

        // Assert
        act.Should().Throw<ValidationException>()
            .WithMessage("EndDate must be later than or equal to StartDate.",
                because: "invalid dates should be reported instead of silently rewritten");
        tools.RecurringTasks.Single().Title.Should().Be("Gym",
            because: "a rejected partial update must not leave other fields changed");
    }
}
