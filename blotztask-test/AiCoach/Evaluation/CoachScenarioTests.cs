using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Tests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit.Abstractions;

namespace BlotzTask.Tests.AiCoach.Evaluation;

public sealed class CoachScenarioTests(DatabaseFixture fixture, ITestOutputHelper output) : IClassFixture<DatabaseFixture>
{
    [CoachLiveTheory]
    [InlineData("listen", AiCoachMode.Execution)]
    [InlineData("listen", AiCoachMode.Clarify)]
    [InlineData("listen", AiCoachMode.Companion)]
    [InlineData("advice", AiCoachMode.Companion)]
    [InlineData("accept", AiCoachMode.Clarify)]
    [InlineData("invitation", AiCoachMode.Companion)]
    [InlineData("content", AiCoachMode.Clarify)]
    [InlineData("defaults", AiCoachMode.Execution)]
    [InlineData("conflict", AiCoachMode.Execution)]
    [InlineData("edit-save", AiCoachMode.Execution)]
    [InlineData("unscheduled", AiCoachMode.Execution)]
    [InlineData("recurring", AiCoachMode.Execution)]
    [InlineData("calendar", AiCoachMode.Execution)]
    [InlineData("two-drafts", AiCoachMode.Execution)]
    public async Task Handle_CoreScenario_RecordsActualOutcomes(string scenario, AiCoachMode mode)
    {
        var raw = Environment.GetEnvironmentVariable("AICOACH_EVAL_RUNS") ?? "1";
        if (!int.TryParse(raw, out var runs) || runs is < 1 or > 10)
            throw new InvalidOperationException("AICOACH_EVAL_RUNS must be between 1 and 10.");
        var failures = new List<Exception>();
        for (var repetition = 1; repetition <= runs; repetition++)
        {
            // Arrange
            await using var session = await CoachTestSession.CreateAsync(fixture, mode);
            var plan = await session.Seeder.CreateSubscriptionPlanAsync($"eval-{Guid.NewGuid():N}", 1_000_000);
            await session.Seeder.CreateUserSubscriptionAsync(session.UserId, plan.Id);
            var id = $"{scenario}-{mode}";
            var harness = new CoachEvaluationHarness(session, id, repetition);
            Exception? failure = null;
            try
            {
                // Act
                await RunScenario(scenario, session, harness);
                // Assert
                session.Conversation.GenerationError.Should().BeNull(because: "a completed scenario must not hide model or application errors");
                session.Conversation.RunningTurnId.Should().BeNull(because: "completed evaluations release the session");
            }
            catch (Exception error) { failure = error; failures.Add(error); }
            finally
            {
                await harness.RecordAsync(id, repetition, Criteria(scenario), failure);
                output.WriteLine($"{id} repetition {repetition}: {harness.ReportPath}; semantic review pending");
            }
        }
        if (failures.Count > 0) throw new AggregateException(failures);
    }

    private static async Task RunScenario(string scenario, CoachTestSession session, CoachEvaluationHarness harness)
    {
        switch (scenario)
        {
            case "listen":
                await harness.SendAsync("我今天终于能休息了，只想分享一下。请不要提问、建议或安排任务。");
                session.Conversation.Drafts.Should().BeEmpty(because: "sharing with explicit limits does not authorize a draft");
                harness.Called("list_tasks").Should().BeFalse(because: "ordinary sharing needs no calendar read");
                break;
            case "advice":
                await harness.SendAsync("最近读书很难坚持，请给我一个小建议，不要创建任务。");
                await harness.SendAsync("这个建议我愿意试试，但先别生成草稿，也不要再问我是否生成。");
                session.Conversation.Drafts.Should().BeEmpty(because: "accepting advice while deferring drafts is not creation consent");
                break;
            case "accept":
                await harness.SendAsync("我想先了解，读书前把手机放到另一间房间有什么好处？暂时不要生成草稿。");
                await harness.SendAsync("现在我决定试试，请帮我创建明天晚上8点读第一章20分钟的草稿。");
                OneItem(session).Date.Should().Be(CoachTestSession.Today.AddDays(1), because: "renewed explicit intent authorizes tomorrow's draft");
                break;
            case "invitation":
                await harness.SendAsync("给我一个明天可以试试的十分钟散步建议，现在先不创建任务。");
                await harness.SendAsync("明天散步十分钟这个行动我愿意试试。");
                session.Conversation.Drafts.Should().BeEmpty(because: "accepting an action suggestion is distinct from accepting draft creation");
                await harness.SendAsync("好的，请生成这个散步任务的草稿。");
                OneItem(session).PersistedTaskId.Should().BeNull(because: "accepting a draft invitation never saves a formal task");
                break;
            case "content":
                await harness.SendAsync("我纠结下班后读书还是散步，请直接比较这两个选择，不要安排任务。");
                await harness.SendAsync("请直接给出你推荐哪个以及理由，不要再问我是否需要比较。");
                session.Conversation.Drafts.Should().BeEmpty(because: "accepting a comparison authorizes content rather than a task");
                break;
            case "defaults":
                await harness.SendAsync("创建明天阅读第一章的草稿，时间和时长你帮我定。");
                var scheduled = OneItem(session);
                scheduled.Date.Should().Be(CoachTestSession.Today.AddDays(1), because: "explicit dates override tentative defaults");
                scheduled.StartTime.Should().NotBeNull(because: "delegated scheduling should not require another confirmation");
                scheduled.EndTime.Should().NotBeNull(because: "the draft should include a usable duration");
                break;
            case "conflict":
                await session.Seeder.CreateTaskAsync(session.UserId, "项目会议", CoachTestSession.Now.AddHours(1), CoachTestSession.Now.AddHours(2));
                await harness.SendAsync("请创建今天上午9点到9点半阅读的草稿，这是我指定的时间，即使有冲突也不要改期，先不要保存。");
                OneItem(session).StartTime.Should().Be(new TimeOnly(9, 0), because: "explicit user times cannot be silently moved to avoid conflicts");
                session.Conversation.Drafts.Single().Schedule!.Status.Should().Be("conflict", because: "the draft overlaps the seeded meeting");
                break;
            case "unscheduled":
                await harness.SendAsync("创建一个阅读第一章的草稿，日期和开始结束时间全部留空，暂时不要排期。");
                var unscheduled = OneItem(session);
                unscheduled.Date.Should().BeNull(because: "an explicit request to leave timing blank overrides defaults");
                unscheduled.StartTime.Should().BeNull(because: "the user has not authorized a start time");
                unscheduled.EndTime.Should().BeNull(because: "the user has not authorized an end time");
                break;
            case "recurring":
                await harness.SendAsync("创建从明天开始每天晚上8点到8点半阅读的重复任务草稿，不设结束日期。");
                OneItem(session).Recurrence.Should().NotBeNull(because: "a repeating request must not become a one-off task");
                session.Conversation.Drafts.Single().Schedule!.Status.Should().Be("partial", because: "only the initial recurrence window was checked");
                break;
            case "calendar":
                await session.Seeder.CreateTaskAsync(session.UserId, "项目会议", CoachTestSession.Now.AddHours(1), CoachTestSession.Now.AddHours(2));
                await harness.SendAsync("请查看今天上午9点到10点我在这个任务应用里有什么安排。只告诉我已有安排，不要创建草稿。");
                harness.Called("list_tasks").Should().BeTrue(because: "calendar-dependent answers require an actual read tool call");
                session.Conversation.Drafts.Should().BeEmpty(because: "reading a schedule does not authorize draft creation");
                break;
            case "two-drafts":
                await harness.SendAsync("单独创建明天早上9点到9点半阅读第一章的草稿。");
                var original = OneItem(session);
                await harness.SendAsync("保留阅读草稿不变，另外创建一张明天下午3点到3点半散步的独立草稿。");
                session.Conversation.Drafts.Should().HaveCount(2, because: "a second topic must not overwrite the first draft");
                session.Conversation.Drafts.SelectMany(draft => draft.Proposals).Should().Contain(original, because: "the first draft's fields and identity remain unchanged");
                break;
            case "edit-save":
                await harness.SendAsync("请创建明天早上9点到9点半阅读第一章的草稿。");
                var initial = OneItem(session);
                await harness.SendAsync("把刚才的阅读草稿改到后天，其他内容不变。");
                var updated = OneItem(session);
                updated.Should().Be(initial with { Date = CoachTestSession.Today.AddDays(2) }, because: "a date correction preserves identity and unrelated fields");
                var draft = session.Conversation.Drafts.Single();
                var edited = new EditedDraftDto { Items = draft.Proposals.Select(item => new EditedDraftItemDto
                {
                    ItemId = item.ProposalId, Title = "阅读第二章", Description = item.Description,
                    Date = item.Date?.ToString("yyyy-MM-dd"), StartTime = "09:00", EndTime = "09:30", TimeZoneId = item.TimeZoneId,
                }).ToArray() };
                await new EditDraftCommandHandler(session.Store, session.Checker).Handle(session.UserId, session.Conversation.Id,
                    draft.Id, new(session.Conversation.Version, draft.Version, edited), default);
                await harness.SendAsync("把这张草稿开始和结束时间都往后移一小时，保留我在卡片上修改的标题和日期。");
                var final = OneItem(session);
                final.ProposalId.Should().Be(initial.ProposalId, because: "manual editing and model editing preserve the same item");
                final.Date.Should().Be(CoachTestSession.Today.AddDays(2), because: "shifting hours must preserve the corrected date");
                final.Title.Should().Be("阅读第二章", because: "model context must include app-side edits");
                final.StartTime.Should().Be(new TimeOnly(10, 0), because: "the requested shift applies to the current draft");
                final.EndTime.Should().Be(new TimeOnly(10, 30), because: "moving the interval preserves duration");
                (await session.Db.TaskItems.CountAsync(task => task.UserId == session.UserId)).Should().Be(0, because: "model tools cannot persist formal tasks");
                var command = session.Confirmation(session.Conversation.Drafts.Single());
                var handler = session.ConfirmHandler();
                var saved = await handler.Handle(command);
                await handler.Handle(command);
                saved.Status.Should().Be("succeeded", because: "reviewed data can be saved by the actual confirmation command");
                (await session.Db.TaskItems.CountAsync(task => task.UserId == session.UserId)).Should().Be(1, because: "confirmation replay must not duplicate the task");
                break;
        }
    }

    private static TaskProposal OneItem(CoachTestSession session)
    {
        session.Conversation.GenerationError.Should().BeNull(because: "generation failures are distinct from semantic failures");
        session.Conversation.Drafts.Should().ContainSingle(because: "the request authorizes one draft");
        session.Conversation.Drafts[0].Proposals.Should().ContainSingle(because: "the requested action is a single item");
        return session.Conversation.Drafts[0].Proposals[0];
    }

    private static string[] Criteria(string scenario) =>
    [
        "Reply addresses the latest request and respects no-question, no-advice and deferral limits.",
        "Draft results are described as unsaved; dates and times match actual tool results.",
        "No invented goals, deadlines, accepted constraints, calendar checks or availability claims.",
        "Accepted content is delivered directly without repeated offers or unnecessary probing.",
        $"Review scenario '{scenario}' in context; partial calendar checks and tentative defaults are accurately qualified.",
    ];
}
