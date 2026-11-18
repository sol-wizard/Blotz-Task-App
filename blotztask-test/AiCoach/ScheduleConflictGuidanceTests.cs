using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

public sealed class ScheduleConflictGuidanceTests
{
    [Fact]
    public async Task Handle_SameOverlapReportedAgain_TellsCoachToStopMovingItemsAndReply()
    {
        // Arrange: every check finds the first item overlapping the same saved task, wherever it is moved.
        var tools = new DraftTools([], "Australia/Perth", reviewListEnabled: true);
        var executor = new ToolExecutor(tools, new AiCoachModuleOptions(), checkSchedule: (items, _) =>
            Task.FromResult(new ScheduleAssessment("conflict", DateTimeOffset.UtcNow,
                [new ScheduleConflict(items[0].ProposalId, "task:42", "Yoga",
                    DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1))])));

        // Act
        var added = await executor.ExecuteAsync(new ModelToolCallRequest("add", "add_items", JsonSerializer.Serialize(new
        {
            items = new object[] { new { kind = "task", title = "复习统计", date = "2026-11-19", startTime = "21:00", endTime = "22:00" } },
            successReply = "已放进待确认清单。",
        })), default);
        var itemId = tools.Drafts.Single().Proposals.Single().ProposalId;
        var moved = await executor.ExecuteAsync(new ModelToolCallRequest("move", "update_items", JsonSerializer.Serialize(new
        {
            items = new object[] { new { itemId, fields = new { startTime = "20:00", endTime = "21:00" } } },
            successReply = "改好了。",
        })), default);

        // Assert
        Guidance(added).Should().Contain("theirs to settle",
            because: "a first overlap is explained once, so the coach keeps the user's time and names it");
        Guidance(moved).Should().StartWith("No new overlaps",
            because: "the same overlap again means moving items is not helping, so the coach should reply instead");
    }

    [Fact]
    public async Task Handle_LaterCallAddsAnotherItem_ReportsOnlyTheNewItemsOverlaps()
    {
        // Arrange: the first item overlaps a saved task; the second one fits.
        var tools = new DraftTools([], "Australia/Perth", reviewListEnabled: true);
        var executor = new ToolExecutor(tools, new AiCoachModuleOptions(), checkSchedule: (items, _) =>
        {
            var old = items.Single(item => item.Title == "复习统计");
            return Task.FromResult(new ScheduleAssessment("conflict", DateTimeOffset.UtcNow,
                [new ScheduleConflict(old.ProposalId, "42", "Yoga", DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1))]));
        });
        await executor.ExecuteAsync(Add("first", "复习统计", "21:00", "22:00"), default);

        // Act
        var second = await executor.ExecuteAsync(Add("second", "跑步", "07:00", "08:00"), default);

        // Assert
        using var document = JsonDocument.Parse(second.Content);
        var schedule = document.RootElement.GetProperty("schedule");
        schedule.GetProperty("conflicts").GetArrayLength().Should().Be(0,
            because: "an overlap of an item this call did not change is old news and only invites more edits");
        schedule.GetProperty("status").GetString().Should().Be("clear",
            because: "the items this call added fit, so the coach can finish with its prewritten reply");
        schedule.GetProperty("otherOverlaps").GetInt32().Should().Be(1,
            because: "the coach still knows the card shows an overlap it may mention");
        second.SuccessReply.Should().NotBeNull(because: "a clear check lets the turn end without another model call");
    }

    [Fact]
    public async Task Handle_ItemRepeatsSavedTask_MarksItAsLikelyDuplicateEvenWhenUntouched()
    {
        // Arrange: a saved task at the same time with nearly the same title. Perth is UTC+8.
        var tools = new DraftTools([], "Australia/Perth", reviewListEnabled: true);
        var savedStart = new DateTimeOffset(2026, 11, 19, 21, 0, 0, TimeSpan.FromHours(8));
        var executor = new ToolExecutor(tools, new AiCoachModuleOptions(), checkSchedule: (items, _) =>
        {
            var old = items.Single(item => item.Title == "3.6 结果分析");
            return Task.FromResult(new ScheduleAssessment("conflict", DateTimeOffset.UtcNow,
                [new ScheduleConflict(old.ProposalId, "42", "3.6结果分析整理", savedStart, savedStart.AddHours(1))]));
        });
        var first = await executor.ExecuteAsync(Add("first", "3.6 结果分析", "21:00", "22:00"), default);

        // Act
        var second = await executor.ExecuteAsync(Add("second", "跑步", "07:00", "08:00"), default);

        // Assert
        using var document = JsonDocument.Parse(second.Content);
        var conflict = document.RootElement.GetProperty("schedule").GetProperty("conflicts").EnumerateArray().Single();
        conflict.GetProperty("likelyDuplicate").GetBoolean().Should().BeTrue(
            because: "saving the item would create the same task twice, so the coach must hear about it");
        Guidance(first).Should().Contain("remove that item",
            because: "a duplicate is removed, not moved to another slot");
    }

    [Fact]
    public async Task Handle_MovedItemHitsAnotherTask_TellsCoachNotToMoveAgainAndEndsTheTurn()
    {
        // Arrange: a suggested 21:00 slot overlaps yoga; wherever it moves, it lands on another task.
        var tools = new DraftTools([], "Australia/Perth", reviewListEnabled: true);
        var executor = new ToolExecutor(tools, new AiCoachModuleOptions(), checkSchedule: (items, _) =>
        {
            var item = items.Single();
            var (identity, title) = item.StartTime == new TimeOnly(21, 0) ? ("task:1", "Yoga") : ("task:2", "Cleaning");
            return Task.FromResult(new ScheduleAssessment("conflict", DateTimeOffset.UtcNow,
                [new ScheduleConflict(item.ProposalId, identity, title, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddHours(1))]));
        });
        var added = await executor.ExecuteAsync(new ModelToolCallRequest("add", "add_items", JsonSerializer.Serialize(new
        {
            items = new object[]
            {
                new { kind = "task", title = "冲刺复习", date = "2026-12-08", startTime = "21:00", endTime = "22:00",
                    suggestedFields = new[] { "startTime", "endTime" } },
            },
            successReply = "已放进待确认清单。",
        })), default);
        var itemId = tools.Drafts.Single().Proposals.Single().ProposalId;

        // Act
        var moved = await executor.ExecuteAsync(new ModelToolCallRequest("move", "update_items", JsonSerializer.Serialize(new
        {
            items = new object[] { new { itemId, fields = new { startTime = "19:30", endTime = "20:30" } } },
            successReply = "改到了19:30。",
        })), default);

        // Assert
        Guidance(added).Should().Contain("Move only items whose time you suggested",
            because: "the first overlap of a suggested time is worth one move");
        added.SuccessReply.Should().BeNull(because: "the coach still has to move the item it placed");
        Guidance(moved).Should().StartWith("You already moved items",
            because: "a new overlap after the one move would otherwise start another move, one model call each");
        moved.SuccessReply.Should().Contain("Cleaning",
            because: "the turn ends on the prewritten reply naming the remaining overlap instead of moving again");
    }

    private static ModelToolCallRequest Add(string id, string title, string start, string end) =>
        new(id, "add_items", JsonSerializer.Serialize(new
        {
            items = new object[] { new { kind = "task", title, date = "2026-11-19", startTime = start, endTime = end } },
            successReply = "已放进待确认清单。",
        }));

    private static string Guidance(ToolExecutionResult result)
    {
        using var document = JsonDocument.Parse(result.Content);
        return document.RootElement.GetProperty("guidance").GetString()!;
    }
}
