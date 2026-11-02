using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Commands.Tasks;
using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using BlotzTask.Modules.Tasks.Enums;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.AiCoach.Application.Queries;
using BlotzTask.Modules.Notes.Commands;
using Microsoft.Extensions.Logging.Abstractions;

namespace BlotzTask.Modules.AiCoach.Application.Commands;

// Reviewed draft data is the only input to formal task creation.

public class ConfirmDraftRequest
{
    public required Guid CommandId { get; init; }
    public required int ExpectedConversationVersion { get; init; }
    public required int ExpectedDraftVersion { get; init; }
    /// <summary>add_all</summary>
    public required string Action { get; init; }
    public required EditedDraftDto EditedDraft { get; init; }
    /// <summary>The user explicitly accepted the conflicts shown for this confirmation.</summary>
    public bool AllowScheduleConflict { get; init; }
    public string? AcceptedConflictToken { get; init; }
}

/// <summary>
/// The card as the user confirms it. Items the user removed from the card are simply absent;
/// every item present must already be on the set (the client cannot add tasks the model never
/// proposed — that is a new conversation turn).
/// </summary>
public class EditedDraftDto
{
    public required IReadOnlyList<EditedDraftItemDto> Items { get; init; }
}

public class EditedDraftItemDto
{
    public required Guid ItemId { get; init; }
    public required string Title { get; init; }
    public string? Kind { get; init; }
    public string? Description { get; init; }
    /// <summary>yyyy-MM-dd</summary>
    public string? Date { get; init; }
    /// <summary>HH:mm</summary>
    public string? StartTime { get; init; }
    public string? EndTime { get; init; }
    public string TimeZoneId { get; init; } = "";
    public int? LabelId { get; init; }
    public EditedRecurrenceDto? Recurrence { get; init; }
}

public class EditedRecurrenceDto
{
    public required string Frequency { get; init; }
    public required int Interval { get; init; }
    public int? DaysOfWeek { get; init; }
    public int? DayOfMonth { get; init; }
    public string? EndDate { get; init; }
}

public class ConfirmDraftResultDto
{
    public required Guid CommandId { get; init; }
    /// <summary>succeeded | failed</summary>
    public required string Status { get; init; }
    public string? ErrorCode { get; init; }
    /// <summary>Every task created by this confirmation (and earlier retries of the same card).</summary>
    public required IReadOnlyList<PersistedEntityDto> PersistedEntities { get; init; }
    public required ConversationSnapshotDto ConversationSnapshot { get; init; }
}

public class PersistedEntityDto
{
    public required string Kind { get; init; }
    public required string Id { get; init; }
    public string? SeriesId { get; init; }
}

/// <summary>Field-level validation failure — mapped to HTTP 422 with a stable code.</summary>
public sealed class DraftFieldValidationException(string errorCode, string message) : Exception(message)
{
    public string ErrorCode { get; } = errorCode;
}

/// <summary>Idempotency conflicts and already-processed sets — mapped to HTTP 409.</summary>
public sealed class DraftConflictException(string errorCode, string message, ConversationSnapshotDto? snapshot = null,
    ScheduleAssessment? assessment = null)
    : Exception(message)
{
    public string ErrorCode { get; } = errorCode;
    public ConversationSnapshotDto? Snapshot { get; } = snapshot;
    public ScheduleAssessment? Assessment { get; } = assessment;
}

public class ConfirmDraftCommand
{
    public required Guid UserId { get; init; }
    public required Guid ConversationId { get; init; }
    public required Guid DraftId { get; init; }
    public required ConfirmDraftRequest Request { get; init; }
}

/// <summary>Confirm reviewed data. The model never participates in formal task writes.</summary>
public sealed class ConfirmDraftCommandHandler(IConversationStore store, AddTaskCommandHandler addTask,
    CreateRecurringTaskCommandHandler createRecurringTask,
    BlotzTaskDbContext db, TimeProvider clock, ILogger<ConfirmDraftCommandHandler> logger,
    DraftScheduleChecker? scheduleChecker = null, AiCoachTraceRecorder? trace = null,
    CreateNoteCommandHandler? createNote = null)
{
    public async Task<ConfirmDraftResultDto> Handle(ConfirmDraftCommand command, CancellationToken ct = default)
    {
        var request = command.Request;
        if (request.Action != "add_all")
            throw new DraftFieldValidationException("InvalidDraftFields", "Unknown confirmation action.");
        var hash = DraftEditing.Hash(new { command.DraftId, request.Action, request.EditedDraft,
            request.AllowScheduleConflict, request.AcceptedConflictToken });
        ProposalSet draft;
        IReadOnlyList<ResolvedDraftItem> resolved;
        IReadOnlyList<TaskProposal> items;
        IReadOnlyList<TaskProposal> selected;
        using (await store.AcquireLockAsync(command.ConversationId, ct))
        {
            var conversation = await ConversationApplication.LoadOwnedAsync(store, command.UserId, command.ConversationId, ct);
            ConversationApplication.RequireOpen(conversation);
            var committed = await db.AiCoachDraftConfirmations.AsNoTracking()
                .SingleOrDefaultAsync(value => value.UserId == command.UserId && value.CommandId == request.CommandId, ct);
            if (committed is not null && (committed.ConversationId != command.ConversationId
                || committed.DraftId != command.DraftId || committed.RequestHash != hash))
                throw new DraftConflictException("IdempotencyKeyReused", "Command ID was reused with different data.");
            committed ??= await db.AiCoachDraftConfirmations.AsNoTracking().SingleOrDefaultAsync(value =>
                value.ConversationId == command.ConversationId && value.DraftId == command.DraftId
                && value.UserId == command.UserId, ct);
            if (committed is not null)
            {
                ApplyCommitted(conversation, committed);
                await store.SaveAsync(conversation, ct);
                return Result(conversation, DraftEditing.Find(conversation, command.DraftId), request.CommandId);
            }
            if (conversation.Receipts.TryGetValue(request.CommandId, out var receipt))
            {
                if (receipt.RequestHash != hash) throw new DraftConflictException("IdempotencyKeyReused", "Command ID was reused with different data.");
                if (receipt.Result is ConfirmDraftResultDto previous)
                    return CopyResult(previous, ConversationSnapshotProjector.ToDto(conversation));
                throw new DraftConflictException("DraftConfirmationInProgress", "Confirmation is running.", ConversationSnapshotProjector.ToDto(conversation));
            }
            draft = DraftEditing.Find(conversation, command.DraftId);
            if (draft.Status == ProposalSetStatus.Completed)
            {
                // Repeating an already completed action must not create another task.
                return Result(conversation, draft, request.CommandId);
            }
            DraftEditing.CheckEditable(conversation, draft, request.ExpectedConversationVersion, request.ExpectedDraftVersion);
            items = DraftEditing.Apply(request.EditedDraft, draft);
            if (items.Count != draft.Proposals.Count)
                throw new DraftFieldValidationException("InvalidDraftSelection", "Edit or remove items before confirming the complete review list.");
            selected = items.Where(item => !item.IsSaved).ToArray();
            if (selected.Count == 0)
                throw new DraftFieldValidationException("InvalidDraftSelection", "Select one or more unsaved draft items.");
            foreach (var item in selected.Where(item => item.Kind == ProposalKind.Task))
                _ = Resolve(item);
        }

        var assessment = scheduleChecker is null || selected.All(item => item.Kind == ProposalKind.Note) ? null
            : await scheduleChecker.CheckAsync(command.UserId, selected, ct);
        using (await store.AcquireLockAsync(command.ConversationId, ct))
        {
            var conversation = await ConversationApplication.LoadOwnedAsync(store, command.UserId, command.ConversationId, ct);
            ConversationApplication.RequireOpen(conversation);
            if (conversation.Receipts.TryGetValue(request.CommandId, out var receipt))
            {
                if (receipt.RequestHash != hash) throw new DraftConflictException("IdempotencyKeyReused", "Command ID was reused with different data.");
                if (receipt.Result is ConfirmDraftResultDto previous)
                    return CopyResult(previous, ConversationSnapshotProjector.ToDto(conversation));
                throw new DraftConflictException("DraftConfirmationInProgress", "Confirmation is running.", ConversationSnapshotProjector.ToDto(conversation));
            }
            draft = DraftEditing.Find(conversation, command.DraftId);
            DraftEditing.CheckEditable(conversation, draft, request.ExpectedConversationVersion, request.ExpectedDraftVersion);
            if (assessment?.Status is "conflict" or "unverified")
            {
                if (assessment.Status == "unverified" || !request.AllowScheduleConflict
                    || assessment.ConflictToken != request.AcceptedConflictToken)
                {
                    // The client reads the reviewed conflict token from the draft snapshot.
                    draft.Replace(items);
                    draft.SetSchedule(assessment);
                    conversation.Touch();
                    await store.SaveAsync(conversation, ct);
                    throw new DraftConflictException(assessment.Status == "conflict" ? "ScheduleConflict" : "ScheduleUnverified",
                        "Review the latest schedule check before confirming.", ConversationSnapshotProjector.ToDto(conversation), assessment);
                }
            }
            draft.Replace(items);
            resolved = selected.Where(item => item.Kind == ProposalKind.Task)
                .Select(Resolve).ToArray();
            draft.StartSaving(clock.GetUtcNow());
            conversation.Touch();
            conversation.Receipts.Add(request.CommandId, new(command.DraftId, hash, null));
            await store.SaveAsync(conversation, ct);
        }

        var saved = new List<(Guid ItemId, int TaskId, int? SeriesId)>();
        var savedNotes = new List<(Guid ItemId, Guid NoteId)>();
        AiCoachDraftConfirmation? committedBatch = null;
        string? error = null;
        try
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            // Reserve the unique batch and command IDs before creating any business entities.
            committedBatch = new AiCoachDraftConfirmation
            {
                Id = Guid.NewGuid(), UserId = command.UserId, ConversationId = command.ConversationId,
                DraftId = draft.Id, CommandId = request.CommandId, RequestHash = hash,
                SavedDraftJson = "[]", CreatedAt = clock.GetUtcNow(),
            };
            db.AiCoachDraftConfirmations.Add(committedBatch);
            await db.SaveChangesAsync(ct);
            var resolvedById = resolved.ToDictionary(item => item.Item.ProposalId);
            foreach (var proposal in selected)
            {
                if (proposal.Kind == ProposalKind.Note)
                {
                    var note = await (createNote ?? new CreateNoteCommandHandler(db,
                        NullLogger<CreateNoteCommandHandler>.Instance)).Handle(new CreateNoteCommand
                    {
                        UserId = command.UserId, Text = proposal.NoteText, IsPersistent = false,
                    }, ct);
                    savedNotes.Add((proposal.ProposalId, note.Id));
                    continue;
                }
                var item = resolvedById[proposal.ProposalId];
                if (item.Item.Recurrence is { } recurrence)
                {
                    var result = await createRecurringTask.Handle(new CreateRecurringTaskCommand
                    {
                        UserId = command.UserId,
                        TaskDetails = new CreateRecurringTaskRequest
                        {
                            Title = item.Item.Title, Description = item.Item.Description ?? "",
                            TemplateStartTime = item.Start, TemplateEndTime = item.End,
                            TimeType = TaskTimeType.RangeTime, LabelId = item.Item.LabelId,
                            ScheduleTimeZoneId = item.Item.TimeZoneId,
                            Frequency = recurrence.Frequency, Interval = recurrence.Interval,
                            DaysOfWeek = recurrence.DaysOfWeek, DayOfMonth = recurrence.DayOfMonth,
                            StartDate = item.Item.Date!.Value, EndDate = recurrence.EndDate,
                        },
                    }, ct);
                    saved.Add((item.Item.ProposalId, result.RecurringTaskId, result.SeriesId));
                }
                else
                {
                    var taskId = await addTask.Handle(new AddTaskCommand
                    {
                        UserId = command.UserId,
                        TaskDetails = new AddTaskItemDto
                        {
                            Title = item.Item.Title, Description = item.Item.Description ?? "",
                            StartTime = item.Start, EndTime = item.End,
                            TimeType = TaskTimeType.RangeTime, LabelId = item.Item.LabelId,
                        },
                    }, ct);
                    saved.Add((item.Item.ProposalId, taskId, null));
                }
            }
            var completed = draft.Copy();
            foreach (var item in saved) completed.RecordSaved(item.ItemId, item.TaskId, item.SeriesId);
            foreach (var item in savedNotes) completed.RecordSavedNote(item.ItemId, item.NoteId);
            completed.CompleteSelection(selected.Select(item => item.ProposalId).ToArray());
            committedBatch.SavedDraftJson = ConversationSerializer.SerializeDrafts([completed])!;
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(CancellationToken.None);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AiCoach draft save failed for {DraftId}", command.DraftId);
            saved.Clear();
            savedNotes.Clear();
            db.ChangeTracker.Clear();
            // A commit acknowledgement can be lost; the durable record is authoritative.
            committedBatch = await db.AiCoachDraftConfirmations.AsNoTracking()
                .SingleOrDefaultAsync(value => value.ConversationId == command.ConversationId
                    && value.DraftId == command.DraftId && value.UserId == command.UserId, CancellationToken.None);
            error = committedBatch is null ? "TaskPersistenceFailed" : null;
        }

        // Keep receipt and task IDs even if the client disconnects after database commit.
        ConfirmDraftResultDto finalResult;
        using (await store.AcquireLockAsync(command.ConversationId, CancellationToken.None))
        {
            var conversation = await ConversationApplication.LoadOwnedAsync(store, command.UserId, command.ConversationId, CancellationToken.None);
            draft = DraftEditing.Find(conversation, command.DraftId);
            if (committedBatch is not null)
            {
                ApplyCommitted(conversation, committedBatch);
                draft = DraftEditing.Find(conversation, command.DraftId);
            }
            else
            {
                foreach (var item in saved) draft.RecordSaved(item.ItemId, item.TaskId, item.SeriesId);
                foreach (var item in savedNotes) draft.RecordSavedNote(item.ItemId, item.NoteId);
                if (error is null) draft.CompleteSelection(selected.Select(item => item.ProposalId).ToArray());
                else draft.FinishSaving(error);
                conversation.RecordDraftEvent(error is null ? "saved" : "save_failed", draft);
            }
            finalResult = Result(conversation, draft, request.CommandId);
            conversation.Receipts[request.CommandId] = new(command.DraftId, hash, finalResult);
            await store.SaveAsync(conversation, CancellationToken.None);
        }
        if (trace is not null) await trace.RecordAsync(command.UserId, command.ConversationId, null, "draft_confirmation", new
        {
            command.DraftId, request.CommandId, request.Action, items,
            finalResult.Status, finalResult.ErrorCode, finalResult.PersistedEntities,
        });
        return finalResult;
    }

    private ResolvedDraftItem Resolve(TaskProposal item)
    {
        if (item.Date is not { } date || item.StartTime is not { } start || item.EndTime is not { } end)
            throw new DraftFieldValidationException("ScheduleRequired", "Set a date, start time and end time before saving.");
        var zone = TimeZoneInfo.FindSystemTimeZoneById(item.TimeZoneId);
        var startUtc = DraftEditing.ResolveLocal(date, start, zone);
        var endUtc = DraftEditing.ResolveLocal(date, end, zone);
        if (endUtc <= startUtc) throw new DraftFieldValidationException("InvalidDraftFields", "End must be after start.");
        if (startUtc < clock.GetUtcNow())
            throw new DraftFieldValidationException("ScheduleInPast", "This time has passed. Edit the draft before saving.");
        return new(item, startUtc, endUtc);
    }

    internal static void ApplyCommitted(Conversation conversation, AiCoachDraftConfirmation confirmation)
    {
        var saved = ConversationSerializer.DeserializeDrafts(confirmation.SavedDraftJson)?.Single()
            ?? throw new InvalidOperationException("Committed confirmation has no saved draft.");
        if (saved.Id != confirmation.DraftId || saved.Status != ProposalSetStatus.Completed)
            throw new InvalidOperationException("Invalid committed confirmation.");
        var index = conversation.Drafts.FindIndex(value => value.Id == saved.Id);
        // Retention or a topic operation may have removed this draft. Never resurrect it.
        if (index < 0) throw new DraftConflictException("DraftNotFound", "The confirmed draft is no longer retained.");
        if (conversation.Drafts[index].Status != ProposalSetStatus.Completed)
        {
            conversation.Drafts[index] = saved;
            conversation.RecordDraftEvent("saved", saved);
        }
        conversation.Receipts[confirmation.CommandId] = new(saved.Id, confirmation.RequestHash,
            Result(conversation, saved, confirmation.CommandId));
    }

    private static ConfirmDraftResultDto Result(Conversation conversation, ProposalSet draft, Guid commandId)
    {
        var succeeded = draft.Status == ProposalSetStatus.Completed;
        var saved = draft.Proposals.Where(item => item.IsSaved).ToArray();
        return new()
        {
            CommandId = commandId, Status = succeeded ? "succeeded" : "failed",
            ErrorCode = succeeded ? null : draft.SaveError,
            PersistedEntities = saved.Select(item => new PersistedEntityDto {
                Kind = item.Kind == ProposalKind.Note ? "note" : item.Recurrence is null ? "task" : "recurring_task",
                Id = item.Kind == ProposalKind.Note ? item.PersistedNoteId!.Value.ToString()
                    : item.PersistedTaskId!.Value.ToString(CultureInfo.InvariantCulture),
                SeriesId = item.PersistedSeriesId?.ToString(CultureInfo.InvariantCulture) }).ToArray(),
            ConversationSnapshot = ConversationSnapshotProjector.ToDto(conversation),
        };
    }

    private static ConfirmDraftResultDto CopyResult(ConfirmDraftResultDto previous, ConversationSnapshotDto snapshot) => new()
    {
        CommandId = previous.CommandId, Status = previous.Status, ErrorCode = previous.ErrorCode,
        PersistedEntities = previous.PersistedEntities, ConversationSnapshot = snapshot,
    };
    private sealed record ResolvedDraftItem(TaskProposal Item, DateTimeOffset Start, DateTimeOffset End);
}
