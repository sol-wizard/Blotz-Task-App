using System.Text.Json;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Modules.Users.Domain;
using BlotzTask.Modules.UserUnderstanding.Commands;
using BlotzTask.Modules.UserUnderstanding.Domain;
using BlotzTask.Modules.UserUnderstanding.Queries;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

public sealed class SegmentDigestProcessorTests(DatabaseFixture fixture) : IClassFixture<DatabaseFixture>
{
    [Fact]
    public async Task Handle_PausedChatWithLastingPreference_StoresExtractedMemoryOnce()
    {
        // Arrange
        await using var harness = await Harness.CreateAsync(fixture);
        await harness.ChatAsync("From now on please keep your replies short", "Sure, I will keep them short.");
        harness.Clock.Now = harness.Clock.Now.Add(SegmentDigestProcessor.PauseBeforeLearning).AddMinutes(1);
        harness.Gateway.Respond = _ => Digest(null, Memory("preference", "Prefers short replies", 0));

        // Act
        await harness.Processor.ProcessBatchAsync(default);
        await harness.Processor.ProcessBatchAsync(default);

        // Assert
        var memory = await harness.Db.UserMemories.AsNoTracking().SingleAsync(m => m.UserId == harness.UserId);
        memory.Source.Should().Be(UserMemorySource.Extracted, because: "it was learned from chat, not asked for");
        memory.EvidenceExcerpt.Should().Be("From now on please keep your replies short",
            because: "the user's own words explain where the memory came from");
        harness.Gateway.Calls.Should().Be(1, because: "the cursor moves past processed messages so they are read once");
    }

    [Fact]
    public async Task Handle_ChatStillActive_WaitsForAPause()
    {
        // Arrange
        await using var harness = await Harness.CreateAsync(fixture);
        await harness.ChatAsync("From now on please keep your replies short", "Sure.");
        harness.Clock.Now = harness.Clock.Now.AddMinutes(3);

        // Act
        await harness.Processor.ProcessBatchAsync(default);

        // Assert
        harness.Gateway.Calls.Should().Be(0, because: "learning waits until the exchange has settled");
    }

    [Fact]
    public async Task Handle_MemorySwitchedOff_PassesMessagesOverWithoutAModelCall()
    {
        // Arrange
        await using var harness = await Harness.CreateAsync(fixture);
        harness.Db.UserPreferences.Add(new UserPreference { UserId = harness.UserId, AiMemoryEnabled = false });
        await harness.Db.SaveChangesAsync();
        await harness.ChatAsync("Remember that I work night shifts these days", "Noted.");
        harness.Clock.Now = harness.Clock.Now.AddMinutes(11);

        // Act
        await harness.Processor.ProcessBatchAsync(default);
        var preference = await harness.Db.UserPreferences.SingleAsync(p => p.UserId == harness.UserId);
        preference.AiMemoryEnabled = true;
        await harness.Db.SaveChangesAsync();
        await harness.Processor.ProcessBatchAsync(default);

        // Assert
        harness.Gateway.Calls.Should().Be(0,
            because: "messages sent while memory was off are never learned, even after it is switched back on");
    }

    [Fact]
    public async Task Handle_IdlePastTopicBoundary_SummaryIsReadyForTheNextTopic()
    {
        // Arrange
        await using var harness = await Harness.CreateAsync(fixture);
        await harness.ChatAsync("Plan my exam revision for next week", "Here is a plan.");
        harness.Clock.Now = harness.Clock.Now.AddHours(9);
        harness.Gateway.Respond = request =>
        {
            request.SystemPrompt.Should().Contain("Closing summary", because: "an idle topic needs its closing summary");
            return Digest("Planned exam revision for 2026-10-23.");
        };

        // Act
        await harness.Processor.ProcessBatchAsync(default);
        var prepared = await harness.Segments.PrepareSendAsync(harness.UserId, harness.Open.Id, Guid.NewGuid(),
            null, default);
        var previous = await harness.Store.FindPreviousSummaryAsync(harness.UserId, harness.Clock.Now, default);

        // Assert
        prepared.ConversationId.Should().NotBe(harness.Open.Id, because: "a send after the idle boundary starts a new topic");
        previous.Should().Be("Planned exam revision for 2026-10-23.",
            because: "the summary written while idle is what the new topic's first turn reads, with no wait");
    }

    [Fact]
    public async Task Handle_CandidateMatchingADeletedMemory_IsNotLearnedAgain()
    {
        // Arrange
        await using var harness = await Harness.CreateAsync(fixture);
        var remembered = await harness.Remember.Handle(new RememberUserMemoryCommand
        {
            UserId = harness.UserId, Kind = UserMemoryKind.Routine, Content = "Goes to the gym on Mondays",
        });
        await new ForgetUserMemoryCommandHandler(harness.Db, harness.Clock, NullLogger<ForgetUserMemoryCommandHandler>.Instance)
            .Handle(new ForgetUserMemoryCommand { UserId = harness.UserId, MemoryId = remembered.Memory!.Id });
        await harness.ChatAsync("Like I said, I go to the gym on Mondays", "Got it.");
        harness.Clock.Now = harness.Clock.Now.AddMinutes(11);
        harness.Gateway.Respond = _ => Digest(null, Memory("routine", "goes to the gym on mondays", 0));

        // Act
        await harness.Processor.ProcessBatchAsync(default);

        // Assert
        (await harness.Db.UserMemories.CountAsync(m => m.UserId == harness.UserId && m.Status == UserMemoryStatus.Active))
            .Should().Be(0, because: "a memory the user deleted is never re-learned from chat");
    }

    [Fact]
    public async Task Handle_UsersLaterCorrection_ReplacesEvenAnExplicitMemory()
    {
        // Arrange
        await using var harness = await Harness.CreateAsync(fixture);
        var explicitMemory = (await harness.Remember.Handle(new RememberUserMemoryCommand
        {
            UserId = harness.UserId, Kind = UserMemoryKind.Routine, Content = "Has class on Wednesday evenings",
        })).Memory!;
        await harness.ChatAsync("My classes finished for good, Wednesday evenings are free now", "Good to know.");
        harness.Clock.Now = harness.Clock.Now.AddMinutes(11);
        harness.Gateway.Respond = _ => Digest(null,
            Memory("routine", "Wednesday evenings are free", 0, replaces: explicitMemory.Ref));

        // Act
        await harness.Processor.ProcessBatchAsync(default);

        // Assert
        var stored = await harness.Db.UserMemories.AsNoTracking().SingleAsync(m => m.Id == explicitMemory.Id);
        stored.Status.Should().Be(UserMemoryStatus.Superseded,
            because: "users rarely say 'forget'; their own later words are how a stale memory is corrected");
    }

    [Fact]
    public async Task Handle_CandidateFromAnAssistantMessage_IsIgnored()
    {
        // Arrange
        await using var harness = await Harness.CreateAsync(fixture);
        await harness.ChatAsync("Any tips for studying better at home?", "You could study every morning at 7.");
        harness.Clock.Now = harness.Clock.Now.AddMinutes(11);
        harness.Gateway.Respond = _ => Digest(null, Memory("routine", "Studies every morning at 7", 1));

        // Act
        await harness.Processor.ProcessBatchAsync(default);

        // Assert
        (await harness.Db.UserMemories.CountAsync(m => m.UserId == harness.UserId)).Should().Be(0,
            because: "the assistant's own suggestion is not a fact about the user");
    }

    [Fact]
    public async Task Handle_UserWithoutQuota_LeavesTheCursorForALaterPass()
    {
        // Arrange
        await using var harness = await Harness.CreateAsync(fixture, withPlan: false);
        await harness.ChatAsync("From now on please keep your replies short", "Sure.");
        harness.Clock.Now = harness.Clock.Now.AddMinutes(11);
        var before = (await harness.Db.AiCoachConversations.AsNoTracking().SingleAsync(r => r.Id == harness.Open.Id)).MemoryProcessedAt;

        // Act
        await harness.Processor.ProcessBatchAsync(default);

        // Assert
        harness.Gateway.Calls.Should().Be(0, because: "background work never runs past the user's AI quota");
        (await harness.Db.AiCoachConversations.AsNoTracking().SingleAsync(r => r.Id == harness.Open.Id)).MemoryProcessedAt
            .Should().Be(before, because: "skipped messages stay pending until quota allows");
    }

    private static object Memory(string kind, string content, int messageIndex, string? replaces = null) =>
        new { kind, content, validThrough = (string?)null, replaces, messageIndex };

    private static ModelCompletionResult Digest(string? summary, params object[] memories) =>
        new(null, [new ModelToolCallRequest("call-1", "save_digest", JsonSerializer.Serialize(new { summary, memories }))],
            ModelFinishReason.ToolCalls, 10, 10, 20);

    private sealed class ScriptedGateway : IModelGateway
    {
        public Func<ModelGatewayRequest, ModelCompletionResult> Respond { get; set; } = _ => Digest(null);
        public int Calls { get; private set; }

        public Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken)
        {
            Calls++;
            return Task.FromResult(Respond(request));
        }
    }

    private sealed class Harness : IAsyncDisposable
    {
        private readonly ServiceProvider _services;
        private readonly MemoryCache _cache = new(new MemoryCacheOptions());
        public BlotzTaskDbContext Db { get; }
        public ConversationSegmentTests.SegmentClock Clock { get; } = new();
        public ScriptedGateway Gateway { get; } = new();
        public SqlConversationStore Store { get; }
        public ConversationSegments Segments { get; }
        public SegmentDigestProcessor Processor { get; }
        public RememberUserMemoryCommandHandler Remember { get; }
        public Conversation Open { get; private set; } = null!;
        public Guid UserId => Open.UserId;

        private Harness(DatabaseFixture fixture)
        {
            Db = new(fixture.Options);
            _services = new ServiceCollection().AddScoped(_ => new BlotzTaskDbContext(fixture.Options)).BuildServiceProvider();
            var options = Options.Create(new AiCoachModuleOptions { DeploymentId = "scripted" });
            Store = new(_services.GetRequiredService<IServiceScopeFactory>(), Clock, options, NullLogger<SqlConversationStore>.Instance);
            Segments = new(Store, Clock, options);
            Remember = new(Db, Clock, NullLogger<RememberUserMemoryCommandHandler>.Instance);
            var generator = new SegmentDigestGenerator(Gateway, new CheckAiQuotaService(Db, _cache), new RecordAiUsageService(Db),
                new AiCoachUsageTracker(), options, NullLogger<SegmentDigestGenerator>.Instance);
            Processor = new(Db, Store, generator, Remember, new GetUserContextQueryHandler(Db, Clock), Clock, options,
                TestDbContextFactory.CreateLogger<SegmentDigestProcessor>());
        }

        public static async Task<Harness> CreateAsync(DatabaseFixture fixture, bool withPlan = true)
        {
            var harness = new Harness(fixture);
            var seeder = new DataSeeder(harness.Db);
            var userId = await seeder.CreateUserAsync();
            if (withPlan)
            {
                var plan = await seeder.CreateSubscriptionPlanAsync($"digest-{Guid.NewGuid():N}", 1_000_000);
                await seeder.CreateUserSubscriptionAsync(userId, plan.Id);
            }
            harness.Open = await harness.Segments.OpenAsync(userId, "Australia/Perth", default);
            return harness;
        }

        public async Task ChatAsync(string userText, string assistantText)
        {
            var turn = Guid.NewGuid();
            Open.BeginTurn(turn, userText, Clock.Now);
            Clock.Now = Clock.Now.AddSeconds(5);
            Open.CompleteTurn(turn, Open.Version, assistantText, null,
                [new GatewayAssistantMessage(assistantText, [])], [], null, 0, completedAt: Clock.Now);
            await Store.SaveAsync(Open, default);
        }

        public async ValueTask DisposeAsync()
        {
            await Db.DisposeAsync();
            await _services.DisposeAsync();
            _cache.Dispose();
        }
    }
}
