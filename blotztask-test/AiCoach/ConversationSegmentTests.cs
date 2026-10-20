using Azure;
using Azure.AI.OpenAI;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Application.Queries;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

public sealed class ConversationSegmentTests(DatabaseFixture fixture) : IClassFixture<DatabaseFixture>
{
    [Theory]
    [InlineData(-1, false)]
    [InlineData(0, false)]
    [InlineData(1, true)]
    public async Task Handle_IdleBoundary_SplitsOnlyStrictlyAfterEightHours(int extraTicks, bool split)
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        await session.AddTurnAsync();
        session.Clock.Now = session.Open.Messages.Last().CreatedAt.AddHours(8).AddTicks(extraTicks);
        // Act
        var prepared = await session.Segments.PrepareSendAsync(session.UserId, session.Open.Id,
            Guid.NewGuid(), session.Open.Version, default);
        // Assert
        (prepared.ConversationId != session.Open.Id).Should().Be(split,
            because: "exactly eight hours belongs to the same topic; the server splits only after that boundary");
        var previous = (await session.Store.FindAsync(session.Open.Id, default))!;
        previous.EndedAt.HasValue.Should().Be(split, because: "the previous segment ends only when a boundary is crossed");
        (await session.Db.AiCoachConversations.CountAsync(x => x.UserId == session.UserId && x.EndedAt == null))
            .Should().Be(1, because: "rotation must leave one open segment");
    }

    [Fact]
    public async Task Handle_IdleSendWithSummaryFailure_AcceptsMessageInFreshSegment()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        await session.AddTurnAsync(withDraft: true);
        session.Clock.Now = session.Open.Messages.Last().CreatedAt.AddHours(9);
        var messageId = Guid.NewGuid();
        // Act
        // This user has no subscription. Real quota validation fails before any model call.
        var snapshot = await session.Application.SendAsync(session.UserId, session.Open.Id, messageId,
            "A new topic", session.Open.Version, default);
        // Assert
        snapshot.ConversationId.Should().NotBe(session.Open.Id, because: "the response tells the client to switch segments");
        snapshot.Messages.Should().Contain(message => message.Id == messageId && message.Text == "A new topic",
            because: "closing-summary failure must not prevent accepting the user's new message");
        snapshot.Artifacts.Should().BeEmpty(because: "expired drafts are not transferred to the new topic");
        var previous = (await session.Store.FindAsync(session.Open.Id, default))!;
        previous.EndedAt.Should().NotBeNull(because: "summary failure does not roll back the topic boundary");
        previous.ClosingSummary.Should().BeNull(because: "a failed summary is optional context");
        previous.Drafts.Single().Status.Should().Be(ProposalSetStatus.Expired, because: "pending drafts expire when their topic ends");
        previous.Messages.Last().DraftSnapshot!.Single().Status.Should().Be(ProposalSetStatus.Expired,
            because: "the historical card must show the same expired status");
    }

    [Theory]
    [InlineData(22, 3, 1)]
    [InlineData(7, 2, 0)]
    public void Handle_DateChange_UsesLocalDayWithoutEndingSegment(int startHour, int hoursLater, int expectedEvents)
    {
        // Arrange
        var local = new DateTimeOffset(2026, 10, 16, startHour, 0, 0, TimeSpan.FromHours(8));
        var conversation = NewConversation(Guid.NewGuid(), local);
        var first = Guid.NewGuid();
        conversation.BeginTurn(first, "Tomorrow I will read", local);
        conversation.CompleteTurn(first, conversation.Version, "Understood", null, [], [], null, 0, completedAt: local);
        // Act
        conversation.BeginTurn(Guid.NewGuid(), "What should I do today?", local.AddHours(hoursLater));
        // Assert
        var events = conversation.History.OfType<GatewaySystemMessage>()
            .Where(message => message.Content.StartsWith("App date change event", StringComparison.Ordinal)).ToArray();
        events.Should().HaveCount(expectedEvents, because: "only the local date boundary matters, independently of UTC midnight");
        conversation.EndedAt.Should().BeNull(because: "midnight does not end an active topic");
        if (expectedEvents > 0)
        {
            events[0].Content.Should().Contain("2026-10-17", because: "the new absolute local date grounds relative references");
            conversation.History[^2].Should().BeOfType<GatewaySystemMessage>(
                because: "the notice precedes the new user message in model history");
        }
    }

    [Fact]
    public async Task Handle_EmptyTopic_IsReusedEvenAfterLongIdleOrManualNewTopic()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        session.Clock.Now = session.Clock.Now.AddDays(40);
        // Act
        var manual = await session.Segments.NewTopicAsync(session.UserId, "Australia/Perth", default);
        var prepared = await session.Segments.PrepareSendAsync(session.UserId, manual.Id,
            Guid.NewGuid(), manual.Version, default);
        // Assert
        manual.Id.Should().Be(session.Open.Id, because: "an empty segment has no topic to end");
        prepared.ConversationId.Should().Be(manual.Id, because: "idle detection requires a previous message");
        (await session.Db.AiCoachConversations.CountAsync(x => x.UserId == session.UserId)).Should().Be(1,
            because: "repeated opens and new-topic actions must not accumulate empty segments");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Handle_BusyTopic_RefusesManualBoundary(bool savingDraft)
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        if (savingDraft)
        {
            await session.AddTurnAsync(withDraft: true);
            session.Open.Drafts.Single().StartSaving(session.Clock.Now);
        }
        else session.Open.BeginTurn(Guid.NewGuid(), "Still running", session.Clock.Now);
        await session.Store.SaveAsync(session.Open, default);
        // Act
        var end = () => session.Segments.NewTopicAsync(session.UserId, "Australia/Perth", default);
        // Assert
        await end.Should().ThrowAsync<DraftConflictException>(because: "an active turn or task save must finish before ending its topic");
        (await session.Store.FindAsync(session.Open.Id, default))!.EndedAt.Should().BeNull(
            because: "refusing a boundary must leave the segment open");
    }

    [Fact]
    public async Task Handle_EndSegment_RejectsSendEditConfirmDiscardAndLateStoreSave()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        await session.AddTurnAsync(withDraft: true);
        var stale = (await session.Store.FindAsync(session.Open.Id, default))!;
        await session.Segments.NewTopicAsync(session.UserId, "Australia/Perth", default);
        var draft = session.Open.Drafts.Single();
        var edited = new EditedDraftDto { Items = [] };
        var confirm = new ConfirmDraftCommandHandler(session.Store,
            new AddTaskCommandHandler(session.Db, NullLogger<AddTaskCommandHandler>.Instance),
            new CreateRecurringTaskCommandHandler(session.Db, NullLogger<CreateRecurringTaskCommandHandler>.Instance),
            session.Db, session.Clock, NullLogger<ConfirmDraftCommandHandler>.Instance);
        // Act
        var send = () => session.Application.SendAsync(session.UserId, stale.Id, Guid.NewGuid(), "Late message", stale.Version, default);
        var edit = () => new EditDraftCommandHandler(session.Store).Handle(session.UserId, stale.Id, draft.Id,
            new(stale.Version, draft.Version, edited), default);
        var discard = () => new RejectDraftCommandHandler(session.Store).Handle(new()
        {
            UserId = session.UserId, ConversationId = stale.Id, DraftId = draft.Id,
            Request = new(Guid.NewGuid(), stale.Version),
        });
        var save = () => confirm.Handle(new()
        {
            UserId = session.UserId, ConversationId = stale.Id, DraftId = draft.Id,
            Request = new()
            {
                CommandId = Guid.NewGuid(), Action = "add_to_task_list", ExpectedConversationVersion = stale.Version,
                ExpectedDraftVersion = draft.Version, EditedDraft = edited,
            },
        });
        var late = () => session.Store.SaveAsync(stale, default);
        // Assert
        await send.Should().ThrowAsync<ConversationEndedException>(because: "an ended topic cannot accept new turns");
        await edit.Should().ThrowAsync<ConversationEndedException>(because: "historical draft cards are read-only");
        await discard.Should().ThrowAsync<ConversationEndedException>(because: "discard is also a write to an ended segment");
        await save.Should().ThrowAsync<ConversationEndedException>(because: "confirmation cannot persist tasks from an ended topic");
        await late.Should().ThrowAsync<ConversationEndedException>(because: "a stale writer must not reopen the segment");
        (await session.Db.TaskItems.CountAsync(x => x.UserId == session.UserId)).Should().Be(0,
            because: "all ended-topic operations must fail before formal task persistence");
    }

    [Fact]
    public async Task Handle_ConcurrentOpenAcrossInstances_ReturnsOneSegment()
    {
        // Arrange
        await using var first = new Session(fixture);
        await using var second = new Session(fixture);
        var userId = await new DataSeeder(first.Db).CreateUserAsync();
        // Act
        var opened = await Task.WhenAll(first.Segments.OpenAsync(userId, "Australia/Perth", default),
            second.Segments.OpenAsync(userId, "Australia/Perth", default));
        // Assert
        opened.Select(segment => segment.Id).Distinct().Should().ContainSingle(
            because: "the SQL unique index resolves concurrent creation on different app instances");
    }

    [Fact]
    public async Task Handle_ClosingSummary_ReadsOnlyLatestEndedSegmentAndNeverRecreatesDeletedData()
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture);
        await session.AddTurnAsync();
        session.Open.End(session.Clock.Now);
        await session.Store.SaveAsync(session.Open, default);
        await session.Store.SaveClosingSummaryAsync(session.Open, "First topic only", default);
        await session.Store.SaveClosingSummaryAsync(session.Open, "Must not overwrite", default);
        session.Clock.Now = session.Clock.Now.AddHours(1);
        var next = await session.Segments.OpenAsync(session.UserId, "Australia/Perth", default);
        // Act
        var previous = await session.Store.FindPreviousSummaryAsync(session.UserId, next.CreatedAt, default);
        next.BeginTurn(Guid.NewGuid(), "Second topic", session.Clock.Now);
        next.CompleteTurn(next.RunningTurnId!.Value, next.Version, "Done", null, [], [], null, 0, completedAt: session.Clock.Now);
        next.End(session.Clock.Now);
        await session.Store.SaveAsync(next, default);
        var latest = await session.Store.FindPreviousSummaryAsync(session.UserId, session.Clock.Now.AddMinutes(1), default);
        await session.Db.AiCoachConversations.Where(x => x.Id == session.Open.Id).ExecuteDeleteAsync();
        await session.Store.SaveClosingSummaryAsync(session.Open, "Late summary", default);
        // Assert
        previous.Should().Be("First topic only", because: "a stored closing summary is written only once");
        latest.Should().BeNull(because: "a failed latest summary must not fall back to an older topic");
        (await session.Db.AiCoachConversations.AnyAsync(x => x.Id == session.Open.Id)).Should().BeFalse(
            because: "late summary results cannot resurrect cleared history");
    }

    [Fact]
    public async Task Handle_PreviousClosingSummary_IsDataInModelContextWithoutLiveDrafts()
    {
        // Arrange
        await using var session = new Session(fixture);
        var request = new ModelTurnRequest(Guid.NewGuid(),
            [new GatewayUserMessage("Continue")], [], "Australia/Perth", session.Clock.Now, null, 0,
            PreviousClosingSummary: "On 2026-10-15 the reading draft expired.");
        var builder = new ModelContextBuilder(session.Options, NullLogger<ModelContextBuilder>.Instance);
        // Act
        var context = await builder.BuildAsync(request, [], call => session.Gateway.CompleteAsync(call, default));
        // Assert
        context.Transcript[0].Should().BeOfType<GatewaySystemMessage>(because: "the closing summary enters as historical data");
        ((GatewaySystemMessage)context.Transcript[0]).Content.Should().Contain(request.PreviousClosingSummary,
            because: "the immediately previous topic gives continuity to the next turn");
        request.Drafts.Should().BeEmpty(because: "historical summaries do not transfer expired draft cards into the live workspace");
        request.History.Should().ContainSingle(because: "previous summaries are not appended to the segment's own history for chaining");
    }

    [CoachLiveTheory]
    [InlineData(0)]
    [InlineData(2)]
    public async Task Handle_RealClosingSummary_StoresAbsoluteDatesAndExpiredDraftContext(int emptyDays)
    {
        // Arrange
        await using var session = await Session.CreateAsync(fixture, live: true);
        var seeder = new DataSeeder(session.Db);
        var plan = await seeder.CreateSubscriptionPlanAsync($"segment-{Guid.NewGuid():N}", 1_000_000);
        await seeder.CreateUserSubscriptionAsync(session.UserId, plan.Id);
        session.Clock.Now = session.Clock.Now.AddDays(emptyDays);
        var draftDate = DateOnly.FromDateTime(session.Clock.Now.DateTime).AddDays(1).ToString("yyyy-MM-dd");
        await session.AddTurnAsync(withDraft: true);
        session.Clock.Now = session.Open.Messages.Last().CreatedAt.AddHours(9);
        // Act
        var next = await session.Application.SendAsync(session.UserId, session.Open.Id, Guid.NewGuid(),
            "What was the date of the expired reading draft from our previous topic? Reply with the ISO date only. Do not create or save any drafts.",
            session.Open.Version, default);
        var previous = (await session.Store.FindAsync(session.Open.Id, default))!;
        // Assert
        previous.ClosingSummary.Should().NotBeNullOrWhiteSpace(because: "the real gateway should produce a closing summary");
        previous.ClosingSummary.Should().Contain(draftDate, because: "tomorrow is relative to the first message, even if the empty segment was created earlier");
        next.ConversationId.Should().NotBe(session.Open.Id, because: "the idle message is routed to a new topic");
        next.GenerationError.Should().BeNull(because: "the new topic should complete a real model turn");
        next.Messages.Last().Text.Should().Contain(draftDate, because: "the new turn receives the immediately previous closing summary");
        next.Artifacts.Should().BeEmpty(because: "the new topic carries context but not expired draft state");
        (await session.Db.AiUsageRecords.AnyAsync(x => x.UserId == session.UserId)).Should().BeTrue(
            because: "summary model usage is included in the user's AI accounting");
    }

    private static Conversation NewConversation(Guid userId, DateTimeOffset now) => new()
    {
        Id = Guid.NewGuid(), UserId = userId,
        TimeZoneId = "Australia/Perth", CreatedAt = now,
    };

    internal sealed class SegmentClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(2026, 10, 16, 8, 0, 0, TimeSpan.FromHours(8));
        public override DateTimeOffset GetUtcNow() => Now;
    }

    internal sealed class Session : IAsyncDisposable
    {
        private readonly ServiceProvider _services;
        private readonly MemoryCache _cache = new(new MemoryCacheOptions());
        private readonly ILoggerFactory _logs = LoggerFactory.Create(builder => builder.AddConsole());
        public BlotzTaskDbContext Db { get; }
        public SegmentClock Clock { get; } = new();
        public IOptions<AiCoachModuleOptions> Options { get; }
        public SqlConversationStore Store { get; }
        public ConversationSegments Segments { get; }
        public ConversationApplication Application { get; }
        public IModelGateway Gateway { get; }
        public ChatApplication Chat { get; }
        public AiCoachTraceRetentionService Retention => new(_services.GetRequiredService<IServiceScopeFactory>(), Clock,
            Options, NullLogger<AiCoachTraceRetentionService>.Instance);
        public AiCoachTraceRecorder Trace => new(_services.GetRequiredService<IServiceScopeFactory>(), Clock,
            NullLogger<AiCoachTraceRecorder>.Instance);
        public Conversation Open { get; private set; } = null!;
        public Guid UserId => Open.UserId;

        public Session(DatabaseFixture fixture, bool live = false)
        {
            Db = new(fixture.Options);
            _services = new ServiceCollection().AddScoped(_ => new BlotzTaskDbContext(fixture.Options)).BuildServiceProvider();
            (string Endpoint, string Key, string Deployment)? credentials = live
                ? CoachLiveSettings.Load() ?? throw new InvalidOperationException("Live credentials missing") : null;
            Options = Microsoft.Extensions.Options.Options.Create(new AiCoachModuleOptions { DeploymentId = credentials?.Deployment ?? "unconfigured" });
            Store = new(_services.GetRequiredService<IServiceScopeFactory>(), Clock, Options, NullLogger<SqlConversationStore>.Instance);
            // Non-live users have no subscription: real quota checks stop before this gateway is called.
            Gateway = new AzureOpenAiModelGateway(new AzureOpenAIClient(new Uri(credentials?.Endpoint ?? "https://unconfigured.invalid"),
                new AzureKeyCredential(credentials?.Key ?? "unconfigured")), Options);
            var quota = new CheckAiQuotaService(Db, _cache);
            var accounting = new RecordAiUsageService(Db);
            var usage = new AiCoachUsageTracker();
            var summaries = new ClosingSummaryGenerator(Gateway, quota, accounting, usage, Options, _logs.CreateLogger<ClosingSummaryGenerator>());
            Segments = new(Store, summaries, Clock, Options, _logs.CreateLogger<ConversationSegments>());
            var query = new GetTasksByDateQueryHandler(Db, new(), NullLogger<GetTasksByDateQueryHandler>.Instance);
            var checker = new DraftScheduleChecker(query, new(), Clock, NullLogger<DraftScheduleChecker>.Instance);
            Chat = new(Db, Store, Segments, checker, Clock);
            Application = new(Store, new ModelTurnRuntime(Gateway, Options, NullLogger<ModelTurnRuntime>.Instance,
                    new ModelContextBuilder(Options, NullLogger<ModelContextBuilder>.Instance)),
                quota, accounting, usage, new TaskContextReader(query, Options, Clock), checker,
                Clock, NullLogger<ConversationApplication>.Instance, Segments);
        }

        public static async Task<Session> CreateAsync(DatabaseFixture fixture, bool live = false)
        {
            var session = new Session(fixture, live);
            var userId = await new DataSeeder(session.Db).CreateUserAsync();
            session.Open = await session.Segments.OpenAsync(userId, "Australia/Perth", default);
            return session;
        }

        public async Task AddTurnAsync(bool withDraft = false)
        {
            var draft = new ProposalSet { Id = Guid.NewGuid() };
            draft.Replace([new(Guid.NewGuid(), "Read", null, DateOnly.FromDateTime(Clock.Now.DateTime).AddDays(1),
                new(20, 0), new(20, 30), "Australia/Perth", null)]);
            var turn = Guid.NewGuid();
            Open.BeginTurn(turn, "Create a reading draft for tomorrow at 20:00", Clock.Now);
            Open.CompleteTurn(turn, Open.Version, "An unsaved draft", null,
                [new GatewayAssistantMessage("An unsaved draft", [])], withDraft ? [draft] : [], null, 0, completedAt: Clock.Now);
            await Store.SaveAsync(Open, default);
        }

        public async ValueTask DisposeAsync()
        {
            await Db.DisposeAsync();
            await _services.DisposeAsync();
            _cache.Dispose();
            _logs.Dispose();
        }
    }
}
