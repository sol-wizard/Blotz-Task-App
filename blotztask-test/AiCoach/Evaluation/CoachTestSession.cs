using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Application.Queries;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach.Evaluation;

internal sealed class CoachTestSession : IAsyncDisposable
{
    public static readonly DateTimeOffset Now = new(2026, 10, 1, 8, 0, 0, TimeSpan.FromHours(8));
    public static readonly DateOnly Today = new(2026, 10, 1);
    public BlotzTaskDbContext Db { get; }
    public MemoryCache Cache { get; } = new(new MemoryCacheOptions());
    public InMemoryConversationStore Store { get; }
    public DataSeeder Seeder { get; }
    public TimeProvider Clock { get; } = new EvaluationClock();
    public DraftScheduleChecker Checker { get; }
    public TaskContextReader Reader { get; }
    public Conversation Conversation { get; private set; } = null!;
    public Guid UserId => Conversation.UserId;

    private CoachTestSession(DatabaseFixture fixture)
    {
        Db = new(fixture.Options);
        Seeder = new(Db);
        Store = new(Cache);
        var query = new GetTasksByDateQueryHandler(Db, new(), NullLogger<GetTasksByDateQueryHandler>.Instance);
        Checker = new(query, new(), Clock, NullLogger<DraftScheduleChecker>.Instance);
        Reader = new(query, Options.Create(new AiCoachModuleOptions()), Clock);
    }

    public static async Task<CoachTestSession> CreateAsync(DatabaseFixture fixture, AiCoachMode mode = AiCoachMode.Execution)
    {
        var session = new CoachTestSession(fixture);
        try
        {
            var user = await session.Seeder.CreateUserAsync();
            session.Conversation = new()
            {
                Id = Guid.NewGuid(), UserId = user, Mode = mode, TimeZoneId = "Australia/Perth",
                CreatedAt = Now, ExpiresAt = DateTimeOffset.UtcNow.AddHours(1),
            };
            await session.Store.SaveAsync(session.Conversation, default);
            return session;
        }
        catch { await session.DisposeAsync(); throw; }
    }

    public ProposalSet AddDraft(params TaskProposal[] items)
    {
        var draft = new ProposalSet { Id = Guid.NewGuid() };
        draft.Replace(items);
        Conversation.Drafts.Add(draft);
        return draft;
    }

    public static TaskProposal Item(int hour = 9) => new(Guid.NewGuid(), "Read", null,
        Today, new(hour, 0), new(hour, 30), "Australia/Perth", null);

    public static EditedDraftDto Edit(ProposalSet draft) => new()
    {
        Items = draft.Proposals.Select(item => new EditedDraftItemDto
        {
            ItemId = item.ProposalId, Title = item.Title, Description = item.Description,
            Date = item.Date?.ToString("yyyy-MM-dd"), StartTime = item.StartTime?.ToString("HH:mm"),
            EndTime = item.EndTime?.ToString("HH:mm"), TimeZoneId = item.TimeZoneId, LabelId = item.LabelId,
        }).ToArray(),
    };

    public ConfirmDraftCommand Confirmation(ProposalSet draft, string? token = null, string action = "add_to_task_list") => new()
    {
        UserId = UserId, ConversationId = Conversation.Id, DraftId = draft.Id,
        Request = new()
        {
            CommandId = Guid.NewGuid(), Action = action, ExpectedConversationVersion = Conversation.Version,
            ExpectedDraftVersion = draft.Version, EditedDraft = Edit(draft),
            AllowScheduleConflict = token is not null, AcceptedConflictToken = token,
        },
    };

    public ConfirmDraftCommandHandler ConfirmHandler() => new(Store,
        new AddTaskCommandHandler(Db, NullLogger<AddTaskCommandHandler>.Instance),
        new CreateRecurringTaskCommandHandler(Db, NullLogger<CreateRecurringTaskCommandHandler>.Instance),
        Db, Clock, NullLogger<ConfirmDraftCommandHandler>.Instance, Checker);

    public async ValueTask DisposeAsync() { await Db.DisposeAsync(); Cache.Dispose(); }
    private sealed class EvaluationClock : TimeProvider { public override DateTimeOffset GetUtcNow() => Now.ToUniversalTime(); }
}
