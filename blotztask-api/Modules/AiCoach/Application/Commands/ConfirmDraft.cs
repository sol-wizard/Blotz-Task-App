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

namespace BlotzTask.Modules.AiCoach.Application.Commands;

// Reviewed draft data is the only input to formal task creation.

public class ConfirmDraftRequest
{
    public required Guid CommandId { get; init; }
    public required int ExpectedConversationVersion { get; init; }
    public required int ExpectedDraftVersion { get; init; }
    /// <summary>start_now | add_to_task_list</summary>
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
    public string? Description { get; init; }
    /// <summary>yyyy-MM-dd</summary>
    public string? Date { get; init; }
    /// <summary>HH:mm</summary>
    public string? StartTime { get; init; }
    public string? EndTime { get; init; }
    public required string TimeZoneId { get; init; }
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
    public ClientDirectiveDto? ClientDirective { get; init; }
    public required ConversationSnapshotDto ConversationSnapshot { get; init; }
}

public class PersistedEntityDto
{
    public required string Kind { get; init; }
    public required string Id { get; init; }
    public string? SeriesId { get; init; }
}

public class ClientDirectiveDto
{
    public required string Type { get; init; }
    public required string AssociationId { get; init; }
    public required int FocusMinutes { get; init; }
    public required bool ReturnToAi { get; init; }
}

/// <summary>Field-level validation failure — mapped to HTTP 422 with a stable code.</summary>
public sealed class DraftFieldValidationException(string errorCode, string message) : Exception(message)
{
    public string ErrorCode { get; } = errorCode;
}

/// <summary>Idempotency conflicts and already-processed sets — mapped to HTTP 409.</summary>
public sealed class DraftConflictException(string errorCode, string message, ConversationSnapshotDto? snapshot = null)
    : Exception(message)
{
    public string ErrorCode { get; } = errorCode;
    public ConversationSnapshotDto? Snapshot { get; } = snapshot;
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
    DraftScheduleChecker? scheduleChecker = null, AiCoachTraceRecorder? trace = null)
{
    public async Task<ConfirmDraftResultDto> Handle(ConfirmDraftCommand command, CancellationToken ct = default)
    {
        var request = command.Request;
        if (request.Action is not ("start_now" or "add_to_task_list"))
            throw new DraftFieldValidationException("InvalidDraftFields", "Unknown confirmation action.");
        var hash = DraftEditing.Hash(new { command.DraftId, request.Action, request.EditedDraft,
            request.AllowScheduleConflict, request.AcceptedConflictToken });
        ProposalSet draft;
        IReadOnlyList<ResolvedDraftItem> resolved;
        IReadOnlyList<TaskProposal> items;
        using (await store.AcquireLockAsync(command.ConversationId, ct))
        {
            var conversation = await ConversationApplication.LoadOwnedAsync(store, command.UserId, command.ConversationId, ct);
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
                // Repeating an already completed action must not create another task or restart focus.
                return Result(conversation, draft, request.CommandId, false, 0);
            }
            DraftEditing.CheckEditable(conversation, draft, request.ExpectedConversationVersion, request.ExpectedDraftVersion);
            items = DraftEditing.Apply(request.EditedDraft, draft);
            if (request.Action == "start_now" && (items.Count != 1 || items[0].Recurrence is not null))
                throw new DraftFieldValidationException("InvalidDraftFields", "Start now requires one non-recurring task.");
            foreach (var item in items.Where(item => !item.PersistedTaskId.HasValue))
                _ = Resolve(item, request.Action == "start_now");
        }

        var assessment = scheduleChecker is null ? null : await scheduleChecker.CheckAsync(command.UserId, items,
            request.Action == "start_now", ct);
        using (await store.AcquireLockAsync(command.ConversationId, ct))
        {
            var conversation = await ConversationApplication.LoadOwnedAsync(store, command.UserId, command.ConversationId, ct);
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
                    draft.Replace(items);
                    draft.SetSchedule(assessment);
                    conversation.Touch();
                    await store.SaveAsync(conversation, ct);
                    throw new DraftConflictException(assessment.Status == "conflict" ? "ScheduleConflict" : "ScheduleUnverified",
                        "Review the latest schedule check before confirming.", ConversationSnapshotProjector.ToDto(conversation));
                }
            }
            draft.Replace(items);
            if (assessment is not null) draft.SetSchedule(assessment);
            resolved = items.Where(item => !item.PersistedTaskId.HasValue)
                .Select(item => Resolve(item, request.Action == "start_now")).ToArray();
            draft.StartSaving();
            conversation.Touch();
            conversation.Receipts.Add(request.CommandId, new(command.DraftId, hash, null));
            await store.SaveAsync(conversation, ct);
        }

        var saved = new List<(Guid ItemId, int TaskId, int? SeriesId)>();
        string? error = null;
        try
        {
            if (resolved.Count == 1 && resolved[0].Item.Recurrence is { } recurrence)
            {
                // The recurring command owns its series/template transaction.
                var item = resolved[0];
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
                // AddTask calls SaveChanges. One transaction makes an ordinary batch atomic.
                await using var transaction = await db.Database.BeginTransactionAsync(ct);
                foreach (var item in resolved)
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
                await transaction.CommitAsync(CancellationToken.None);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AiCoach draft save failed for {DraftId}", command.DraftId);
            saved.Clear();
            db.ChangeTracker.Clear();
            error = "TaskPersistenceFailed";
        }

        // Keep receipt and task IDs even if the client disconnects after database commit.
        ConfirmDraftResultDto finalResult;
        using (await store.AcquireLockAsync(command.ConversationId, CancellationToken.None))
        {
            var conversation = await ConversationApplication.LoadOwnedAsync(store, command.UserId, command.ConversationId, CancellationToken.None);
            draft = DraftEditing.Find(conversation, command.DraftId);
            foreach (var item in saved) draft.RecordSaved(item.ItemId, item.TaskId, item.SeriesId);
            draft.FinishSaving(error);
            conversation.RecordDraftEvent(error is null ? "saved" : "save_failed", draft);
            var focusMinutes = resolved.Count == 1 ? Math.Min(15, (int)(resolved[0].End - resolved[0].Start).TotalMinutes) : 0;
            finalResult = Result(conversation, draft, request.CommandId, request.Action == "start_now" && error is null, focusMinutes);
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

    private ResolvedDraftItem Resolve(TaskProposal item, bool startNow)
    {
        if (item.Date is not { } date || item.StartTime is not { } start || item.EndTime is not { } end)
            throw new DraftFieldValidationException("ScheduleRequired", "Set a date, start time and end time before saving.");
        var zone = TimeZoneInfo.FindSystemTimeZoneById(item.TimeZoneId);
        var startUtc = DraftEditing.ResolveLocal(date, start, zone);
        var endUtc = DraftEditing.ResolveLocal(date, end, zone);
        if (endUtc <= startUtc) throw new DraftFieldValidationException("InvalidDraftFields", "End must be after start.");
        if (startNow)
        {
            var duration = endUtc - startUtc;
            startUtc = clock.GetUtcNow();
            endUtc = startUtc + duration;
        }
        return new(item, startUtc, endUtc);
    }

    private static ConfirmDraftResultDto Result(Conversation conversation, ProposalSet draft, Guid commandId, bool startFocus, int focusMinutes)
    {
        var succeeded = draft.Status == ProposalSetStatus.Completed;
        var saved = draft.Proposals.Where(item => item.PersistedTaskId.HasValue).ToArray();
        return new()
        {
            CommandId = commandId, Status = succeeded ? "succeeded" : "failed",
            ErrorCode = succeeded ? null : draft.SaveError,
            PersistedEntities = saved.Select(item => new PersistedEntityDto {
                Kind = item.Recurrence is null ? "task" : "recurring_task",
                Id = item.PersistedTaskId!.Value.ToString(CultureInfo.InvariantCulture),
                SeriesId = item.PersistedSeriesId?.ToString(CultureInfo.InvariantCulture) }).ToArray(),
            ClientDirective = succeeded && startFocus && saved.Length == 1 && focusMinutes > 0
                ? new ClientDirectiveDto { Type = "start_focus", AssociationId = $"task:{saved[0].PersistedTaskId}", FocusMinutes = focusMinutes, ReturnToAi = true } : null,
            ConversationSnapshot = ConversationSnapshotProjector.ToDto(conversation),
        };
    }

    private static ConfirmDraftResultDto CopyResult(ConfirmDraftResultDto previous, ConversationSnapshotDto snapshot) => new()
    {
        CommandId = previous.CommandId, Status = previous.Status, ErrorCode = previous.ErrorCode,
        PersistedEntities = previous.PersistedEntities, ClientDirective = previous.ClientDirective, ConversationSnapshot = snapshot,
    };
    private sealed record ResolvedDraftItem(TaskProposal Item, DateTimeOffset Start, DateTimeOffset End);
}
