using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.Tasks.Enums;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

// No database: these check only how the coach's tools read and show weekly recurrence.
public sealed class RecurrenceToolTests
{
    [Fact]
    public void Handle_WeekdayNames_SavesMatchingFlagsAndShowsNamesBack()
    {
        // Arrange
        var tools = new DraftTools([], "Australia/Sydney", reviewListEnabled: true);
        // Act
        var result = AddWeekly(tools, new[] { "Friday", "Monday", "Wednesday" });
        // Assert
        result.GetProperty("success").GetBoolean().Should().BeTrue(because: "Monday to Sunday names are valid weekdays");
        tools.Drafts.Single().Proposals.Single().Recurrence!.DaysOfWeek.Should().Be(
            (int)(WeeklyDayFlags.Monday | WeeklyDayFlags.Wednesday | WeeklyDayFlags.Friday),
            because: "the saved flags must be exactly the days the model named");
        result.GetProperty("draft").GetProperty("items")[0].GetProperty("recurrence").GetProperty("daysOfWeek")
            .EnumerateArray().Select(day => day.GetString()).Should().Equal(["Monday", "Wednesday", "Friday"],
                because: "the model checks its reply against names in week order, not a number");
    }

    [Theory]
    [InlineData("[]")]
    [InlineData("[\"Funday\"]")]
    [InlineData("[\"1\"]")]
    [InlineData("21")]
    public void Handle_InvalidWeekdays_RejectsWithoutAddingItem(string daysOfWeek)
    {
        // Arrange
        var tools = new DraftTools([], "Australia/Sydney", reviewListEnabled: true);
        // Act
        var result = AddWeekly(tools, JsonSerializer.Deserialize<JsonElement>(daysOfWeek));
        // Assert
        result.GetProperty("success").GetBoolean().Should().BeFalse(
            because: "only a non-empty list of weekday names is accepted, so a miscounted flag sum cannot be saved");
        tools.Drafts.Should().BeEmpty(because: "a rejected call must not leave a partial review list");
    }

    private static JsonElement AddWeekly(DraftTools tools, object daysOfWeek) => Call(tools, "add_items", new
    {
        items = new[]
        {
            new
            {
                kind = "task", title = "Gym", date = "2026-11-16", startTime = "07:00", endTime = "08:00",
                recurrence = new { frequency = "Weekly", interval = 1, daysOfWeek },
            },
        },
        successReply = "每周一三五早上7点去健身，等你确认。",
    });

    private static JsonElement Call(DraftTools tools, string name, object args) =>
        JsonSerializer.Deserialize<JsonElement>(tools.Execute(new(Guid.NewGuid().ToString(), name, JsonSerializer.Serialize(args))));
}
