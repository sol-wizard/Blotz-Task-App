using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Queries;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Modules.UserUnderstanding.Commands;
using BlotzTask.Modules.UserUnderstanding.Domain;
using BlotzTask.Modules.UserUnderstanding.Queries;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit.Abstractions;

namespace BlotzTask.Tests.AiCoach;

/// <summary>Memory behaviour against the real model. Run with AICOACH_MODEL_TESTS=1.</summary>
public sealed class MemoryLiveTests(DatabaseFixture fixture, ITestOutputHelper output) : IClassFixture<DatabaseFixture>
{
    [CoachLiveFact]
    public async Task Handle_RealModel_RemembersAcrossTopicsAndForgetsOnRequest()
    {
        // Arrange
        await using var session = await ConversationSegmentTests.Session.CreateAsync(fixture, live: true);
        await GivePlanAsync(session);
        var application = MemoryApplication(session);

        // Act
        var remembered = await SendAsync(session, application, "请记住：我每周三晚上有课，以后别在那个时间给我安排任务。");
        var memory = await session.Db.UserMemories.AsNoTracking()
            .SingleOrDefaultAsync(m => m.UserId == session.UserId && m.Status == UserMemoryStatus.Active);
        await session.Segments.NewTopicAsync(session.UserId, "Australia/Perth", default);
        var recalled = await SendAsync(session, application, "你记得我周三晚上通常有什么安排吗？用一句话回答。");
        var forgotten = await SendAsync(session, application, "周三晚上的课已经结束了，把这条忘掉吧。");

        // Assert
        memory.Should().NotBeNull(because: "an explicit request to remember is stored through the remember tool");
        memory!.Source.Should().Be(UserMemorySource.Explicit, because: "the user asked for it in their own words");
        memory.Content.Should().Contain("周三", because: "the stored memory keeps the substance of the request");
        recalled.Should().Contain("课", because: "a new topic still sees the remembered item in its user context");
        (await session.Db.UserMemories.AsNoTracking().SingleAsync(m => m.Id == memory.Id)).Status
            .Should().Be(UserMemoryStatus.Deleted, because: "asking to forget deletes the item through the forget tool");
        output.WriteLine($"remember reply: {remembered}\nrecall reply: {recalled}\nforget reply: {forgotten}");
    }

    [CoachLiveFact]
    public async Task Handle_RealModel_OneOffStateIsNotRemembered()
    {
        // Arrange
        await using var session = await ConversationSegmentTests.Session.CreateAsync(fixture, live: true);
        await GivePlanAsync(session);
        var application = MemoryApplication(session);

        // Act
        var reply = await SendAsync(session, application, "我今晚好累，不想运动了。");

        // Assert
        (await session.Db.UserMemories.CountAsync(m => m.UserId == session.UserId)).Should().Be(0,
            because: "a one-off state is ordinary chat context, not something to keep");
        output.WriteLine($"reply: {reply}");
    }

    [CoachLiveFact]
    public async Task Handle_RealDigest_KeepsTheLastingRuleAndDropsTheOneOffState()
    {
        // Arrange
        await using var session = await ConversationSegmentTests.Session.CreateAsync(fixture, live: true);
        await GivePlanAsync(session);
        await session.AddUserTurnAsync("以后帮我安排任务时都留出午休，中午 12 点到 1 点别排任何事。", "好的，之后会避开午休时间。");
        await session.AddUserTurnAsync("今天下午有点忙，先不聊了。", "好的，忙完再来。");
        session.Clock.Now = session.Clock.Now.Add(SegmentDigestProcessor.PauseBeforeLearning).AddMinutes(1);

        // Act
        await session.Digest.ProcessBatchAsync(default);

        // Assert
        var memories = await session.Db.UserMemories.AsNoTracking()
            .Where(m => m.UserId == session.UserId && m.Status == UserMemoryStatus.Active).ToListAsync();
        output.WriteLine(string.Join("\n", memories.Select(m => $"{m.Kind}: {m.Content} (until {m.ValidUntil})")));
        memories.Should().ContainSingle(because: "only the standing lunch-break rule is lasting");
        memories[0].Source.Should().Be(UserMemorySource.Extracted, because: "it was learned from chat in the background");
        memories[0].Content.Should().ContainAny(["午休", "12"], because: "the extracted memory states the lunch-break rule");
        memories.Should().NotContain(m => m.Content.Contains("忙"), because: "being busy this afternoon is a one-off state");
    }

    [CoachLiveFact]
    public async Task Handle_RealDigest_UserSaysItIsOver_ReplacesTheOldMemory()
    {
        // Arrange
        await using var session = await ConversationSegmentTests.Session.CreateAsync(fixture, live: true);
        await GivePlanAsync(session);
        var old = (await Remember(session).Handle(new RememberUserMemoryCommand
        {
            UserId = session.UserId, Kind = UserMemoryKind.Routine, Content = "每周三晚上有课",
        })).Memory!;
        await session.AddUserTurnAsync("这学期的课已经全部上完了，以后周三晚上都空出来了。", "恭喜！");
        session.Clock.Now = session.Clock.Now.Add(SegmentDigestProcessor.PauseBeforeLearning).AddMinutes(1);

        // Act
        await session.Digest.ProcessBatchAsync(default);

        // Assert
        var active = await ActiveAsync(session);
        output.WriteLine(string.Join("\n", active.Select(m => $"{m.Content} (until {m.ValidUntil})")));
        (await session.Db.UserMemories.AsNoTracking().SingleAsync(m => m.Id == old.Id)).Status
            .Should().Be(UserMemoryStatus.Superseded, because: "the user said the class is over for good, without saying 'forget'");
        active.Should().NotContain(m => m.Content.Contains("有课"), because: "nothing still claims Wednesday evenings are taken");
    }

    [CoachLiveFact]
    public async Task Handle_RealDigest_OneOffException_KeepsTheLastingMemory()
    {
        // Arrange
        await using var session = await ConversationSegmentTests.Session.CreateAsync(fixture, live: true);
        await GivePlanAsync(session);
        var lasting = (await Remember(session).Handle(new RememberUserMemoryCommand
        {
            UserId = session.UserId, Kind = UserMemoryKind.Routine, Content = "每周三晚上有课",
        })).Memory!;
        await session.AddUserTurnAsync("这周三晚上的课老师请假停一次。", "好的，那这周三晚上可以安排别的事。");
        session.Clock.Now = session.Clock.Now.Add(SegmentDigestProcessor.PauseBeforeLearning).AddMinutes(1);

        // Act
        await session.Digest.ProcessBatchAsync(default);

        // Assert
        var active = await ActiveAsync(session);
        output.WriteLine(string.Join("\n", active.Select(m => $"{m.Content} (until {m.ValidUntil})")));
        active.Should().Contain(m => m.Id == lasting.Id, because: "one cancelled class does not end the weekly class");
        active.Where(m => m.Id != lasting.Id).Should().OnlyContain(m => m.ValidUntil != null,
            because: "anything learned about this week is temporary");
    }

    private static RememberUserMemoryCommandHandler Remember(ConversationSegmentTests.Session session) =>
        new(session.Db, session.Clock, NullLogger<RememberUserMemoryCommandHandler>.Instance);

    private static Task<List<UserMemory>> ActiveAsync(ConversationSegmentTests.Session session) =>
        session.Db.UserMemories.AsNoTracking()
            .Where(m => m.UserId == session.UserId && m.Status == UserMemoryStatus.Active).ToListAsync();

    private static async Task GivePlanAsync(ConversationSegmentTests.Session session)
    {
        var seeder = new DataSeeder(session.Db);
        var plan = await seeder.CreateSubscriptionPlanAsync($"memory-live-{Guid.NewGuid():N}", 1_000_000);
        await seeder.CreateUserSubscriptionAsync(session.UserId, plan.Id);
    }

    private static ConversationApplication MemoryApplication(ConversationSegmentTests.Session session)
    {
        var cache = new MemoryCache(new MemoryCacheOptions());
        var query = new GetTasksByDateQueryHandler(session.Db, new(), NullLogger<GetTasksByDateQueryHandler>.Instance);
        var checker = new DraftScheduleChecker(query, new(), session.Clock, NullLogger<DraftScheduleChecker>.Instance);
        return new(session.Store,
            new ModelTurnRuntime(session.Gateway, session.Options, NullLogger<ModelTurnRuntime>.Instance,
                new ModelContextBuilder(session.Options, NullLogger<ModelContextBuilder>.Instance)),
            new CheckAiQuotaService(session.Db, cache), new RecordAiUsageService(session.Db), new AiCoachUsageTracker(),
            new TaskContextReader(query, session.Options, session.Clock), checker, session.Clock,
            NullLogger<ConversationApplication>.Instance, session.Segments, trace: null,
            new GetUserContextQueryHandler(session.Db, session.Clock),
            new RememberUserMemoryCommandHandler(session.Db, session.Clock, NullLogger<RememberUserMemoryCommandHandler>.Instance),
            new ForgetUserMemoryCommandHandler(session.Db, session.Clock, NullLogger<ForgetUserMemoryCommandHandler>.Instance));
    }

    private static async Task<string> SendAsync(ConversationSegmentTests.Session session, ConversationApplication application,
        string text)
    {
        var open = (await session.Store.FindOpenAsync(session.UserId, default))!;
        var snapshot = await application.SendAsync(session.UserId, open.Id, Guid.NewGuid(), text, open.Version, default);
        snapshot.GenerationError.Should().BeNull(because: "the real model turn should complete");
        session.Clock.Now = session.Clock.Now.AddMinutes(1);
        return snapshot.Messages.Last().Text;
    }
}
