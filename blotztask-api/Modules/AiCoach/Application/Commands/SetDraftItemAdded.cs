using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Application.Queries;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.Notes.Commands;
using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.AiCoach.Application.Commands;

/// <summary>The wanted state of one review item: true saves it, false deletes what it saved.</summary>
public sealed record SetDraftItemAddedRequest(bool Added);

/// <summary>Conflicts are existing tasks that a newly saved task overlaps, so the app can name them.</summary>
public sealed record SetDraftItemAddedResultDto(ConversationSnapshotDto ConversationSnapshot,
    IReadOnlyList<ScheduleConflict> Conflicts);

/// <summary>
/// Tick and untick on a review card. Each call saves or deletes one item right away with the owning module's
/// handlers, then records the saved ID on the item. It sets a wanted state, so repeating a call changes nothing.
/// </summary>
public sealed class SetDraftItemAddedCommandHandler(IConversationStore store, AddTaskCommandHandler addTask,
    CreateRecurringTaskCommandHandler createRecurringTask, CreateNoteCommandHandler createNote,
    DeleteTaskCommandHandler deleteTask, DeleteRecurringOccurrenceCommandHandler deleteRecurring,
    DeleteNoteCommandHandler deleteNote, BlotzTaskDbContext db, TimeProvider clock,
    ILogger<SetDraftItemAddedCommandHandler> logger, DraftScheduleChecker? scheduleChecker = null,
    AiCoachTraceRecorder? trace = null)
{
    public Task<SetDraftItemAddedResultDto> Handle(Guid userId, Guid conversationId, Guid draftId, Guid itemId,
        SetDraftItemAddedRequest request, CancellationToken ct) => request.Added
        ? AddAsync(userId, conversationId, draftId, itemId, ct)
        : RemoveAsync(userId, conversationId, draftId, itemId, ct);

    private async Task<SetDraftItemAddedResultDto> AddAsync(Guid userId, Guid conversationId, Guid draftId,
        Guid itemId, CancellationToken ct)
    {
        TaskProposal checkedItem;
        using (await store.AcquireLockAsync(conversationId, ct))
        {
            var conversation = await ConversationApplication.LoadOwnedAsync(store, userId, conversationId, ct);
            checkedItem = FindOpenItem(conversation, draftId, itemId);
            if (checkedItem.IsSaved) return Unchanged(conversation);
            if (checkedItem.Kind == ProposalKind.Task) DraftEditing.ResolveSchedule(checkedItem, clock.GetUtcNow());
        }
        // Reading the calendar can be slow, so it runs outside the lock, as it does for edits and Add all.
        var assessment = checkedItem.Kind == ProposalKind.Task && scheduleChecker is not null
            ? await scheduleChecker.CheckAsync(userId, [checkedItem], ct) : null;
        using (await store.AcquireLockAsync(conversationId, ct))
        {
            var conversation = await ConversationApplication.LoadOwnedAsync(store, userId, conversationId, ct);
            var item = FindOpenItem(conversation, draftId, itemId);
            if (item.IsSaved) return Unchanged(conversation);
            // A single insert, so the lock stays held across it: a second tick on this item waits, then finds it saved.
            var saved = await CreateAsync(userId, item, ct);
            try
            {
                var draft = DraftEditing.Find(conversation, draftId);
                draft.RecordItemSaved(itemId, saved.PersistedTaskId, saved.PersistedSeriesId, saved.PersistedNoteId);
                conversation.RecordDraftEvent("item_saved_by_user", draft);
                await store.SaveAsync(conversation, ct);
            }
            catch (Exception ex)
            {
                // Without its saved ID the card would look empty, and the next tick would save a second copy.
                logger.LogError(ex, "AiCoach could not record saved item {ItemId}; deleting it again", itemId);
                try { await DeleteAsync(userId, saved, CancellationToken.None); }
                catch (Exception undo) { logger.LogError(undo, "AiCoach could not delete unrecorded item {ItemId}", itemId); }
                throw;
            }
            // An edit between the two locks makes the check describe a time that was not saved.
            var sameSchedule = checkedItem.Date == item.Date && checkedItem.StartTime == item.StartTime
                && checkedItem.EndTime == item.EndTime;
            IReadOnlyList<ScheduleConflict> conflicts = assessment?.Status == "conflict" && sameSchedule
                ? assessment.Conflicts : [];
            if (trace is not null) await trace.RecordAsync(userId, conversationId, null, "draft_item_saved",
                new { draftId, itemId, conflicts });
            return new(ConversationSnapshotProjector.ToDto(conversation), conflicts);
        }
    }

    private async Task<SetDraftItemAddedResultDto> RemoveAsync(Guid userId, Guid conversationId, Guid draftId,
        Guid itemId, CancellationToken ct)
    {
        using (await store.AcquireLockAsync(conversationId, ct))
        {
            var conversation = await ConversationApplication.LoadOwnedAsync(store, userId, conversationId, ct);
            var item = FindOpenItem(conversation, draftId, itemId);
            if (!item.IsSaved) return Unchanged(conversation);
            // If the conversation save below fails, the item still shows saved. The next untick finds nothing left
            // to delete and only clears it.
            await DeleteAsync(userId, item, ct);
            var draft = DraftEditing.Find(conversation, draftId);
            draft.ClearItemSaved(itemId);
            conversation.RecordDraftEvent("item_deleted_by_user", draft);
            await store.SaveAsync(conversation, ct);
            if (trace is not null) await trace.RecordAsync(userId, conversationId, null, "draft_item_deleted",
                new { draftId, itemId });
            return Unchanged(conversation);
        }
    }

    private static TaskProposal FindOpenItem(Conversation conversation, Guid draftId, Guid itemId)
    {
        ConversationApplication.RequireIdle(conversation);
        var draft = DraftEditing.Find(conversation, draftId);
        if (!draft.IsReviewList)
            throw new DraftFieldValidationException("InvalidDraftAction", "Only review list items can be ticked.");
        if (!OperationPolicy.CanEdit(draft))
            throw new DraftConflictException("DraftNotEditable", "Draft is not pending.",
                ConversationSnapshotProjector.ToDto(conversation));
        return draft.Proposals.SingleOrDefault(item => item.ProposalId == itemId)
            ?? throw new DraftConflictException("DraftItemNotFound", "The item is no longer on the list.",
                ConversationSnapshotProjector.ToDto(conversation));
    }

    private async Task<TaskProposal> CreateAsync(Guid userId, TaskProposal item, CancellationToken ct)
    {
        if (item.Kind == ProposalKind.Note)
        {
            var note = await createNote.Handle(DraftItemCommands.Note(userId, item), ct);
            return item with { PersistedNoteId = note.Id };
        }
        var (start, end) = DraftEditing.ResolveSchedule(item, clock.GetUtcNow());
        if (item.Recurrence is { } recurrence)
        {
            var result = await createRecurringTask.Handle(
                DraftItemCommands.Recurring(userId, item, recurrence, start, end), ct);
            return item with { PersistedTaskId = result.RecurringTaskId, PersistedSeriesId = result.SeriesId };
        }
        var taskId = await addTask.Handle(DraftItemCommands.Task(userId, item, start, end), ct);
        return item with { PersistedTaskId = taskId };
    }

    private async Task DeleteAsync(Guid userId, TaskProposal item, CancellationToken ct)
    {
        if (item.Recurrence is not null)
        {
            await DeleteSeriesAsync(userId, item, ct);
            return;
        }
        try
        {
            if (item.Kind == ProposalKind.Note)
                await deleteNote.Handle(new DeleteNoteCommand { NoteId = item.PersistedNoteId!.Value, UserId = userId }, ct);
            else
                await deleteTask.Handle(new DeleteTaskCommand { TaskId = item.PersistedTaskId!.Value, UserId = userId }, ct);
        }
        catch (NotFoundException)
        {
            // Already deleted in the task list or Notes, so the untick only has to forget it.
        }
    }

    /// <summary>
    /// "This and future" from each part's first day. A "this and future" edit in the task list splits a series into
    /// more parts, so every part still running is turned off; none left means it was already deleted there.
    /// </summary>
    private async Task DeleteSeriesAsync(Guid userId, TaskProposal item, CancellationToken ct)
    {
        var running = db.RecurringTasks.AsNoTracking().Where(task => task.UserId == userId && task.IsActive);
        running = item.PersistedSeriesId is { } seriesId
            ? running.Where(task => task.SeriesId == seriesId)
            : running.Where(task => task.Id == item.PersistedTaskId);
        var parts = await running.Select(task => new { task.Id, task.StartDate }).ToListAsync(ct);
        foreach (var part in parts)
            await deleteRecurring.Handle(new DeleteRecurringOccurrenceCommand
            {
                RecurringTaskId = part.Id, OccurrenceDate = part.StartDate, DeleteFuture = true, UserId = userId,
            }, ct);
    }

    private static SetDraftItemAddedResultDto Unchanged(Conversation conversation) =>
        new(ConversationSnapshotProjector.ToDto(conversation), []);
}

/// <summary>How a review item becomes a task, repeating task or note. Shared by Add all and by ticks.</summary>
internal static class DraftItemCommands
{
    public static CreateNoteCommand Note(Guid userId, TaskProposal item) => new()
    {
        UserId = userId, Text = item.NoteText, IsPersistent = false,
    };

    public static AddTaskCommand Task(Guid userId, TaskProposal item, DateTimeOffset start, DateTimeOffset end) => new()
    {
        UserId = userId,
        TaskDetails = new AddTaskItemDto
        {
            Title = item.Title, Description = item.Description ?? "",
            StartTime = start, EndTime = end,
            TimeType = TaskTimeType.RangeTime, LabelId = item.LabelId,
        },
    };

    public static CreateRecurringTaskCommand Recurring(Guid userId, TaskProposal item, RecurrenceProposal recurrence,
        DateTimeOffset start, DateTimeOffset end) => new()
    {
        UserId = userId,
        TaskDetails = new CreateRecurringTaskRequest
        {
            Title = item.Title, Description = item.Description ?? "",
            TemplateStartTime = start, TemplateEndTime = end,
            TimeType = TaskTimeType.RangeTime, LabelId = item.LabelId,
            ScheduleTimeZoneId = item.TimeZoneId,
            Frequency = recurrence.Frequency, Interval = recurrence.Interval,
            DaysOfWeek = recurrence.DaysOfWeek, DayOfMonth = recurrence.DayOfMonth,
            StartDate = item.Date!.Value, EndDate = recurrence.EndDate,
        },
    };
}
