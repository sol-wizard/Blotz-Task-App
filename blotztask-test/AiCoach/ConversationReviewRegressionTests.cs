using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using System.Text.Json;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Session = BlotzTask.Tests.AiCoach.ConversationSegmentTests.Session;

namespace BlotzTask.Tests.AiCoach;

public sealed class ConversationReviewRegressionTests(DatabaseFixture fixture) : IClassFixture<DatabaseFixture>
{
    [Fact]
    public async Task Handle_UpdateOldDraftFromNewZone_PreservesZoneAndUsesCurrentZoneForAddedItems()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        await session.AddTurnAsync(withDraft: true);
        var draft = session.Open.Drafts.Single();
        var original = draft.Proposals.Single();
        var tools = new DraftTools([draft], "Australia/Sydney");
        var args = JsonSerializer.Serialize(new
        {
            draftId = draft.Id,
            changes = new object[]
            {
                new { operation = "update", itemId = original.ProposalId, fields = new { title = "Read chapter two" } },
                new { operation = "add", fields = new { title = "Walk", date = "2026-10-18", startTime = "15:00", endTime = "15:30" } },
            },
        });
        // Act
        var result = JsonSerializer.Deserialize<JsonElement>(tools.Execute(new("zone-update", "update_draft", args)));
        session.Open.Drafts.Clear();
        session.Open.Drafts.AddRange(tools.Drafts);
        await session.Store.SaveAsync(session.Open, default);
        var restored = (await session.Store.FindAsync(session.Open.Id, default))!.Drafts.Single();
        // Assert
        result.GetProperty("success").GetBoolean().Should().BeTrue(because: "a title edit and an independent addition are valid");
        restored.Proposals.Single(item => item.ProposalId == original.ProposalId).TimeZoneId.Should().Be("Australia/Perth",
            because: "editing an existing item's title must not reinterpret its local schedule");
        restored.Proposals.Single(item => item.ProposalId != original.ProposalId).TimeZoneId.Should().Be("Australia/Sydney",
            because: "new items use the current session zone");
        var projected = JsonSerializer.SerializeToElement(DraftTools.View(restored));
        projected.GetProperty("items").EnumerateArray().Select(item => item.GetProperty("timeZoneId").GetString())
            .Should().Equal(["Australia/Perth", "Australia/Sydney"], because: "the model must see each item's own zone");
    }

    [Fact]
    public async Task Handle_LateSummaryAfterRetention_DiscardsPrePruningContent()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        var old = session.Clock.Now.AddDays(-181);
        var turn = Guid.NewGuid();
        session.Open.BeginTurn(turn, "expired-secret", old);
        session.Open.CompleteTurn(turn, session.Open.Version, "Old reply", null, [], [], null, 0, completedAt: old);
        await session.AddTurnAsync();
        session.Open.End(session.Clock.Now);
        await session.Store.SaveAsync(session.Open, default);
        // Act
        await session.Retention.CleanupAsync(default);
        await session.Store.SaveClosingSummaryAsync(session.Open, "Summary containing expired-secret", default);
        // Assert
        var current = (await session.Store.FindAsync(session.Open.Id, default))!;
        current.Messages.Should().HaveCount(2, because: "the segment remains but its expired exchange was removed");
        current.ClosingSummary.Should().BeNull(because: "a summary generated at an older database revision must not restore expired text");
        current.History.OfType<GatewayUserMessage>().Should().NotContain(message => message.Content.Contains("expired-secret"),
            because: "both model context and summary must obey retention");
    }

    [CoachLiveFact]
    public async Task Handle_RealModelEditsOldDraftAfterZoneChange_RetainsOriginalScheduleZone()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture, live: true);
        var seeder = new DataSeeder(session.Db);
        var plan = await seeder.CreateSubscriptionPlanAsync($"zone-edit-{Guid.NewGuid():N}", 1_000_000);
        await seeder.CreateUserSubscriptionAsync(session.UserId, plan.Id);
        await session.AddTurnAsync(withDraft: true);
        var original = session.Open.Drafts.Single().Proposals.Single();
        // Act
        var snapshot = await session.Application.SendAsync(session.UserId, session.Open.Id, Guid.NewGuid(),
            "Rename the existing reading draft to Read chapter two. Change only its title; keep its date, times, time zone and all other fields unchanged. Do not create another draft or save any task.",
            session.Open.Version, default, "Australia/Sydney");
        // Assert
        snapshot.GenerationError.Should().BeNull(because: "the real model should be able to edit a draft from a different zone");
        var updated = snapshot.Artifacts.SelectMany(draft => draft.Payload.Items).Single(item => item.ItemId == original.ProposalId);
        updated.Title.Should().Be("Read chapter two", because: "the requested title change must be applied");
        updated.TimeZoneId.Should().Be("Australia/Perth", because: "a title edit must preserve the explicit schedule zone after travel");
        updated.Date.Should().Be(original.Date!.Value.ToString("yyyy-MM-dd"), because: "no date change was requested");
        updated.StartTime.Should().Be("20:00", because: "the title edit must preserve the original local time");
        (await session.Db.TaskItems.AnyAsync(task => task.UserId == session.UserId)).Should().BeFalse(
            because: "editing a draft is not permission to create a formal task");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Handle_SendFromNewDeviceZone_UsesCurrentZoneAndKeepsHistoricalSchedules(bool idle)
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        await session.AddTurnAsync(withDraft: true);
        if (idle) session.Clock.Now = session.Clock.Now.AddHours(9);
        var messageId = Guid.NewGuid();
        // Act
        var snapshot = await session.Application.SendAsync(session.UserId, session.Open.Id, messageId,
            "Today at three", session.Open.Version, default, "Australia/Sydney");
        var current = (await session.Store.FindAsync(snapshot.ConversationId, default))!;
        var previous = (await session.Store.FindAsync(session.Open.Id, default))!;
        // Assert
        current.TimeZoneId.Should().Be("Australia/Sydney", because: "both a continued topic and an idle rollover use the sending device zone");
        (current.Id != session.Open.Id).Should().Be(idle, because: "a zone change alone does not create a topic boundary");
        current.Messages.Should().Contain(message => message.Id == messageId, because: "the message is accepted before optional model work");
        previous.Drafts.Single().Proposals.Single().TimeZoneId.Should().Be("Australia/Perth",
            because: "existing drafts keep their explicit schedule zones");
        previous.Drafts.Single().Status.Should().Be(idle ? ProposalSetStatus.Expired : ProposalSetStatus.Pending,
            because: "only a real topic boundary expires drafts");
        current.InitialTimeZoneId.Should().Be(idle ? "Australia/Sydney" : "Australia/Perth",
            because: "summary date grounding retains the zone of the first actual message");
        if (!idle)
            current.History.OfType<GatewaySystemMessage>().Should().Contain(message =>
                    message.Content.StartsWith("App time zone change event") && message.Content.Contains("Australia/Perth")
                    && message.Content.Contains("Australia/Sydney"),
                because: "the model needs both old and new local references to interpret earlier relative dates");
    }

    [Fact]
    public async Task Handle_InvalidSendingZone_RejectsBeforeChangingTheTopic()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        await session.AddTurnAsync();
        session.Clock.Now = session.Clock.Now.AddHours(9);
        // Act
        var send = () => session.Application.SendAsync(session.UserId, session.Open.Id, Guid.NewGuid(),
            "Hello", session.Open.Version, default, "invalid/zone");
        // Assert
        await send.Should().ThrowAsync<ValidationException>(because: "invalid device data must not end the open topic");
        (await session.Store.FindAsync(session.Open.Id, default))!.EndedAt.Should().BeNull(
            because: "request validation must precede idle rollover writes");
    }

    [CoachLiveFact]
    public async Task Handle_RealModelAfterZoneChange_CreatesTodayDraftInDeviceZone()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture, live: true);
        var seeder = new DataSeeder(session.Db);
        var plan = await seeder.CreateSubscriptionPlanAsync($"zone-{Guid.NewGuid():N}", 1_000_000);
        await seeder.CreateUserSubscriptionAsync(session.UserId, plan.Id);
        session.Clock.Now = new DateTimeOffset(2026, 10, 16, 20, 30, 0, TimeSpan.FromHours(8));
        await session.AddTurnAsync(withDraft: true);
        session.Clock.Now = session.Clock.Now.AddHours(2);
        // Act
        var snapshot = await session.Application.SendAsync(session.UserId, session.Open.Id, Guid.NewGuid(),
            "Create a new, separate walk draft for today 15:00-15:30. Do not change the existing reading draft. Do not save any tasks.",
            session.Open.Version, default, "Australia/Sydney");
        // Assert
        snapshot.GenerationError.Should().BeNull(because: "the real model should accept the current device-zone context");
        snapshot.ConversationId.Should().Be(session.Open.Id, because: "travel alone does not end the active topic");
        snapshot.Artifacts.SelectMany(draft => draft.Payload.Items).Should().Contain(item =>
                item.TimeZoneId == "Australia/Sydney" && item.Date == "2026-10-17"
                && item.StartTime == "15:00" && item.EndTime == "15:30",
            because: "today is already October 17 in Sydney while Perth is still on October 16");
        snapshot.Artifacts.SelectMany(draft => draft.Payload.Items).Should().Contain(item =>
                item.TimeZoneId == "Australia/Perth" && item.Title == "Read",
            because: "the earlier explicit draft must keep its schedule across a device-zone change");
    }

    [Fact]
    public async Task Handle_ManualTopicWithBlockedSummary_ReturnsNewTopicWithinSummaryBudget()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        await session.AddTurnAsync();
        session.Options.Value.ClosingSummaryTimeoutSeconds = 0.5;
        await using var blocker = await LockQuotaAsync(session);
        // Act
        var next = await session.Segments.NewTopicAsync(session.UserId, "Australia/Sydney", default)
            .WaitAsync(TimeSpan.FromSeconds(5));
        // Assert
        next.Id.Should().NotBe(session.Open.Id, because: "an optional blocked summary must not prevent changing topics");
        (await session.Store.FindOpenAsync(session.UserId, default))!.TimeZoneId.Should().Be("Australia/Sydney",
            because: "the new topic is durable before summary completion");
        (await session.Store.FindAsync(session.Open.Id, default))!.ClosingSummary.Should().BeNull(
            because: "a timed-out quota read produces no closing summary");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Handle_SummaryWait_PersistsMessageFirstAndReleasesRunningState(bool cancel)
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        await session.AddTurnAsync();
        session.Clock.Now = session.Clock.Now.AddHours(9);
        session.Options.Value.ClosingSummaryTimeoutSeconds = 0.5;
        await using var blocker = await LockQuotaAsync(session);
        using var request = new CancellationTokenSource();
        var messageId = Guid.NewGuid();
        // Act
        var sending = session.Application.SendAsync(session.UserId, session.Open.Id, messageId,
            "Keep this message", session.Open.Version, request.Token);
        Conversation? accepted = null;
        var wait = Stopwatch.StartNew();
        while (wait.Elapsed < TimeSpan.FromSeconds(5))
        {
            accepted = await session.Store.FindOpenAsync(session.UserId, default);
            if (accepted?.RunningTurnId == messageId) break;
            await Task.Delay(10);
        }
        if (cancel) request.Cancel();
        else
        {
            await Task.Delay(700);
            await blocker.Database.CurrentTransaction!.RollbackAsync();
        }
        var result = await sending.WaitAsync(TimeSpan.FromSeconds(5));
        // Assert
        accepted!.Messages.Should().Contain(message => message.Id == messageId,
            because: "the user message must be committed while the real quota query is still blocked");
        accepted.RunningTurnId.Should().Be(messageId, because: "clients can reconcile accepted work by polling its running state");
        result.GenerationError.Should().Be(cancel ? "cancelled" : "quota",
            because: "cancellation finishes the accepted turn and summary timeout permits the ordinary quota check to continue");
        result.GenerationStatus.Should().Be("failed", because: "neither cancellation nor summary timeout may leave a permanent running turn");
        result.Messages.Should().Contain(message => message.Id == messageId, because: "request cancellation must not erase accepted input");
    }

    // Exercise cancellation against real SQL locks, without a fake model or quota service.
    private async Task<BlotzTaskDbContext> LockQuotaAsync(Session session)
    {
        var seeder = new DataSeeder(session.Db);
        var plan = await seeder.CreateSubscriptionPlanAsync($"blocked-{Guid.NewGuid():N}", 0);
        var subscription = await seeder.CreateUserSubscriptionAsync(session.UserId, plan.Id);
        var blocker = new BlotzTaskDbContext(fixture.Options);
        await blocker.Database.BeginTransactionAsync();
        await blocker.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE [UserSubscriptions] SET [PlanId] = [PlanId] WHERE [Id] = {subscription.Id}");
        return blocker;
    }
}
