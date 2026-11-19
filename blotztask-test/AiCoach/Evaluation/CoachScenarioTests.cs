using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Modules.Notes.Commands;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit.Abstractions;

namespace BlotzTask.Tests.AiCoach.Evaluation;

public sealed class CoachScenarioTests(DatabaseFixture fixture, ITestOutputHelper output) : IClassFixture<DatabaseFixture>
{
    [CoachLiveTheory]
    [InlineData("listen")]
    [InlineData("advice")]
    [InlineData("speed-advice")]
    [InlineData("accept")]
    [InlineData("invitation")]
    [InlineData("content")]
    [InlineData("defaults")]
    [InlineData("conflict")]
    [InlineData("edit-save")]
    [InlineData("unscheduled")]
    [InlineData("recurring")]
    [InlineData("calendar")]
    [InlineData("two-drafts")]
    [InlineData("long-chat")]
    [InlineData("note")]
    [InlineData("review-list")]
    [InlineData("memory")]
    [InlineData("digest")]
    [InlineData("saved-task-deleted")]
    [InlineData("saved-note-deleted")]
    [InlineData("saved-advice-deleted")]
    [InlineData("saved-task-still-there")]
    public async Task Handle_CoreScenario_RecordsActualOutcomes(string scenario)
    {
        var raw = Environment.GetEnvironmentVariable("AICOACH_EVAL_RUNS") ?? "1";
        if (!int.TryParse(raw, out var runs) || runs is < 1 or > 10)
            throw new InvalidOperationException("AICOACH_EVAL_RUNS must be between 1 and 10.");
        var failures = new List<Exception>();
        for (var repetition = 1; repetition <= runs; repetition++)
        {
            // Arrange
            await using var session = await CoachTestSession.CreateAsync(fixture);
            var plan = await session.Seeder.CreateSubscriptionPlanAsync($"eval-{Guid.NewGuid():N}", 1_000_000);
            await session.Seeder.CreateUserSubscriptionAsync(session.UserId, plan.Id);
            var id = scenario;
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
            case "speed-advice":
                await harness.SendAsync("最近读书很难坚持，请给我一个简短的小建议，不要创建任务，也不要查询日程。");
                break;
            case "accept":
                await harness.SendAsync("我想先了解，读书前把手机放到另一间房间有什么好处？暂时不要生成草稿。");
                await harness.SendAsync("现在我决定试试，请帮我创建明天晚上8点读第一章20分钟的草稿。");
                OneItem(session).Date.Should().Be(CoachTestSession.Today.AddDays(1), because: "renewed explicit intent authorizes tomorrow's draft");
                break;
            case "invitation":
                await harness.SendAsync("给我一个明天可以试试的十分钟散步建议，现在先不创建任务。");
                await harness.SendAsync("明天散步十分钟这个行动我愿意试试。");
                OneItem(session).PersistedTaskId.Should().BeNull(
                    because: "a concrete action the user adopts is drafted, while task persistence still requires confirmation");
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
            case "long-chat":
                // One topic growing to 30 user messages, mixing chat, advice, calendar reads and drafts,
                // to measure how per-message tokens grow with history.
                foreach (var message in LongChatMessages) await harness.SendAsync(message);
                await harness.DigestAsync();
                break;
            // The four cases below measure features of the installed app; run them with AICOACH_EVAL_MOBILE=1.
            case "note":
                await harness.SendAsync("帮我记一下：论文要求使用 APA 第七版，参考文献按作者姓氏排序。");
                session.Conversation.Drafts.SelectMany(draft => draft.Proposals).Should().Contain(item => item.Kind == ProposalKind.Note,
                    because: "an explicit request to note something becomes a note item");
                break;
            case "review-list":
                await harness.SendAsync("明天下午三点到四点写季度报告，再记一下报告要用公司新模板。");
                await harness.SendAsync("季度报告那条删掉吧，我今天已经写完了，笔记留着。");
                session.Conversation.Drafts.SelectMany(draft => draft.Proposals).Should().NotContain(item => item.Kind == ProposalKind.Task,
                    because: "the user removed the task item from the review list");
                break;
            case "memory":
                await harness.SendAsync("请记住：我每周三晚上有课，以后别在那个时间给我安排任务。");
                await harness.SendAsync("你记得我周三晚上通常有什么安排吗？用一句话回答。");
                await harness.SendAsync("周三晚上的课已经结束了，把这条忘掉吧。");
                break;
            case "digest":
                foreach (var message in LongChatMessages.Take(8)) await harness.SendAsync(message);
                await harness.DigestAsync();
                break;
            // PBI 1686: items saved from the review list, then changed outside the chat. Messages are the PBI's repro.
            // Like the cases above, run them with AICOACH_EVAL_MOBILE=1.
            case "saved-task-deleted":
                await harness.SendAsync("Add buy milk tomorrow at 10am");
                await SaveReviewListAsync(session);
                await DeleteSavedTaskAsync(session);
                await harness.SendAsync("I want to buy milk tomorrow at 10am");
                UnsavedItems(session).Should().Contain(item => item.Kind == ProposalKind.Task
                    && item.Title.Contains("milk", StringComparison.OrdinalIgnoreCase),
                    because: "the saved task was deleted in the app, so asking again must draft it again");
                break;
            case "saved-note-deleted":
                await harness.SendAsync("Save a note: my book list is Atomic Habits and Deep Work.");
                await SaveReviewListAsync(session);
                var noteId = await session.Db.Notes.Where(note => note.UserId == session.UserId).Select(note => note.Id).SingleAsync();
                await new DeleteNoteCommandHandler(session.Db, NullLogger<DeleteNoteCommandHandler>.Instance)
                    .Handle(new() { NoteId = noteId, UserId = session.UserId });
                await harness.SendAsync("Save my book list as a note: Atomic Habits and Deep Work.");
                UnsavedItems(session).Should().Contain(item => item.Kind == ProposalKind.Note,
                    because: "the coach cannot read notes, so it must never refuse a note as already saved");
                break;
            case "saved-advice-deleted":
                await harness.SendAsync("Add a team meeting tomorrow from 8pm to 9:30pm");
                await SaveReviewListAsync(session);
                await DeleteSavedTaskAsync(session);
                await harness.SendAsync("What time should I go to the gym tomorrow evening? Just suggest a time, don't add anything.");
                harness.CalledInLastTurn("list_tasks").Should().BeTrue(
                    because: "advice around an existing task must check the task list in the same turn");
                break;
            case "saved-task-still-there":
                await harness.SendAsync("Add buy milk tomorrow at 10am");
                await SaveReviewListAsync(session);
                await harness.SendAsync("I want to buy milk tomorrow at 10am");
                harness.CalledInLastTurn("list_tasks").Should().BeTrue(
                    because: "the coach checks the task list before saying a task already exists");
                UnsavedItems(session).Should().NotContain(item => item.Title.Contains("milk", StringComparison.OrdinalIgnoreCase),
                    because: "a task that is still in the app must not be added again");
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

    private static async Task SaveReviewListAsync(CoachTestSession session)
    {
        session.Conversation.GenerationError.Should().BeNull(because: "generation failures are distinct from semantic failures");
        var draft = session.Conversation.Drafts.Should().ContainSingle(draft => draft.Status == ProposalSetStatus.Pending,
            because: "the first message asks for one item in the review list").Subject;
        // A review-list save records its batch against the conversation's database row. The evaluation keeps the
        // conversation in memory, so add a placeholder row for that foreign key.
        if (!await session.Db.AiCoachConversations.AnyAsync(record => record.Id == session.Conversation.Id))
        {
            session.Db.AiCoachConversations.Add(new()
            {
                Id = session.Conversation.Id, UserId = session.UserId, Payload = "{}",
                CreatedAt = CoachTestSession.Now, LastActivityAt = CoachTestSession.Now, MemoryProcessedAt = CoachTestSession.Now,
            });
            await session.Db.SaveChangesAsync();
        }
        var saved = await session.ConfirmHandler().Handle(session.Confirmation(draft, action: "add_all"));
        saved.Status.Should().Be("succeeded", because: "the scenario starts from an item the user saved with Add all");
    }

    private static async Task DeleteSavedTaskAsync(CoachTestSession session)
    {
        var taskId = await session.Db.TaskItems.Where(task => task.UserId == session.UserId).Select(task => task.Id).SingleAsync();
        await new DeleteTaskCommandHandler(session.Db, NullLogger<DeleteTaskCommandHandler>.Instance)
            .Handle(new() { TaskId = taskId, UserId = session.UserId });
    }

    private static IEnumerable<TaskProposal> UnsavedItems(CoachTestSession session) => session.Conversation.Drafts
        .Where(draft => draft.Status == ProposalSetStatus.Pending).SelectMany(draft => draft.Proposals).Where(item => !item.IsSaved);

    private static TaskProposal OneItem(CoachTestSession session)
    {
        session.Conversation.GenerationError.Should().BeNull(because: "generation failures are distinct from semantic failures");
        session.Conversation.Drafts.Should().ContainSingle(because: "the request authorizes one draft");
        session.Conversation.Drafts[0].Proposals.Should().ContainSingle(because: "the requested action is a single item");
        return session.Conversation.Drafts[0].Proposals[0];
    }

    private static readonly string[] LongChatMessages =
    [
        "今天好累，上了一整天班。",
        "主要是会太多了，自己的事一件都没做完。",
        "下个月要考雅思，但最近一直没怎么复习。",
        "我现在大概 6 分，目标 7 分，听力最弱。",
        "有什么提高听力的办法吗？简单说说就好。",
        "精听具体怎么做？",
        "帮我建一个明天早上7点到7点半精听的草稿。",
        "改到7点半到8点吧。",
        "顺便看看我明天下午有什么安排。",
        "好的。我口语也有点担心，一开口就紧张。",
        "Part 2 怎么准备比较好？",
        "那帮我建一个每天晚上9点练口语20分钟的草稿，先建一周。",
        "时间改成晚上9点半。",
        "其实我最近睡得也不太好，经常一两点才睡。",
        "不是焦虑，就是习惯刷手机。",
        "有没有什么简单的办法让我早点放下手机？",
        "那就试试11点把手机放客厅。",
        "帮我建一个今晚11点放手机的提醒草稿。",
        "对了，这周五要交一个工作报告，还没开始写。",
        "报告大概要写3页，主要是季度数据总结。",
        "帮我把写报告拆成几步吧。",
        "把这些步骤做成草稿，分在周三和周四晚上。",
        "周三那部分改到周三中午12点到1点。",
        "看一下我周三和周四都有什么安排。",
        "好的，谢谢。说实话事情一多我就容易焦虑。",
        "就是觉得什么都做不好。",
        "嗯，可能是我要求太高了。",
        "我们回到雅思，阅读有什么技巧？",
        "先别建草稿了，我自己想想。",
        "今天就聊到这吧，晚安。",
    ];

    private static string[] Criteria(string scenario) =>
    [
        "Reply addresses the latest request and respects no-question, no-advice and deferral limits.",
        "Draft results are described as unsaved; dates and times match actual tool results.",
        "No invented goals, deadlines, accepted constraints, calendar checks or availability claims.",
        "Accepted content is delivered directly without repeated offers or unnecessary probing.",
        $"Review scenario '{scenario}' in context; partial calendar checks and tentative defaults are accurately qualified.",
        .. scenario switch
        {
            "saved-task-deleted" => ["The milk task was saved, then deleted in the app. Asked again, the coach drafts it again instead of saying it is already saved."],
            "saved-note-deleted" => ["The book-list note was saved, then deleted in the app. The coach cannot read notes, so it drafts it again instead of refusing a duplicate."],
            "saved-advice-deleted" => ["The team meeting was saved, then deleted in the app. The gym advice does not plan around that meeting."],
            "saved-task-still-there" => ["The milk task is still saved in the app. The coach checks and says it is already there instead of adding a copy."],
            _ => Array.Empty<string>(),
        },
    ];
}
