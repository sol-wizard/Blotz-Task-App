using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;

namespace BlotzTask.Modules.AiCoach.Application.Commands;

// ---------- Wire contract (schema-2 client, unchanged) ----------
// "Draft" in these DTO names is the client-facing vocabulary; internally the confirmed thing
// is the conversation's current ProposalSet (v3 §18).

public class ConfirmDraftRequest
{
    public required Guid CommandId { get; init; }
    public required int ExpectedConversationVersion { get; init; }
    public required int ExpectedDraftVersion { get; init; }
    /// <summary>start_now | add_to_task_list</summary>
    public required string Action { get; init; }
    public required EditedDraftDto EditedDraft { get; init; }
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
    public required string Date { get; init; }
    /// <summary>HH:mm</summary>
    public required string StartTime { get; init; }
    public required string EndTime { get; init; }
    public required string TimeZoneId { get; init; }
    public int? LabelId { get; init; }
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

/// <summary>
/// Proposal set confirmation (v3 §18): a deterministic user command — zero model calls.
/// Guarantees (in-memory receipts standing in for the Command Receipt table, §18.1):
/// - the same set can only be confirmed once; replays return the first result;
/// - the same commandId with different content returns IdempotencyKeyReused;
/// - all user-edited fields are re-validated server-side, per proposal;
/// - proposals already saved by an earlier (partially failed) attempt keep their stored values
///   and are not created again;
/// - start_now requires exactly one task on the card, shifts it to "now" keeping the full
///   duration, and focusMinutes = min(15, ceil(duration)) is computed HERE, never by the model.
/// </summary>
public class ConfirmDraftCommandHandler(
    IConversationStore store,
    IConversationApplication application,
    TimeProvider clock)
{
    private const string CommandType = "confirm_draft";

    public async Task<ConfirmDraftResultDto> Handle(ConfirmDraftCommand command, CancellationToken ct = default)
    {
        var request = command.Request;

        var action = ConversationActionExtensions.FromWireValue(request.Action);
        if (action is not (ConversationAction.StartNow or ConversationAction.AddToTaskList))
            throw new DraftFieldValidationException("InvalidDraftFields", $"Unsupported confirm action '{request.Action}'.");

        if (request.EditedDraft?.Items is null || request.EditedDraft.Items.Count == 0)
            throw new DraftFieldValidationException("InvalidDraftFields", "The draft must keep at least one task.");
        if (request.EditedDraft.Items.Count > ProposalSet.MaxProposals)
            throw new DraftFieldValidationException("InvalidDraftFields", $"The draft may hold at most {ProposalSet.MaxProposals} tasks.");
        if (request.EditedDraft.Items.Select(i => i.ItemId).Distinct().Count() != request.EditedDraft.Items.Count)
            throw new DraftFieldValidationException("InvalidDraftFields", "Duplicate task item.");
        if (action == ConversationAction.StartNow && request.EditedDraft.Items.Count != 1)
            throw new DraftFieldValidationException("InvalidDraftFields", "start_now needs exactly one task on the card.");

        var requestHash = ComputeRequestHash(command.DraftId, request);

        // ---- Receipt / replay checks under the conversation lock (v3 §18.1) ----
        IReadOnlyList<TaskProposal> stored;
        using (await store.AcquireLockAsync(command.ConversationId, ct))
        {
            var conversation = await LoadOwnedAsync(command.UserId, command.ConversationId, ct);

            if (conversation.Receipts.TryGetValue(request.CommandId, out var existing))
            {
                if (existing.RequestHash != requestHash)
                    throw new DraftConflictException("IdempotencyKeyReused",
                        "This commandId was already used with different content.");
                if (existing.Result is ConfirmDraftResultDto replay)
                    return replay;
                throw new DraftConflictException("DraftConfirmationInProgress",
                    "This command is still being processed.",
                    ConversationSnapshotProjector.ToDto(conversation));
            }

            // Same set already confirmed by a different command: replay the first result.
            var firstConfirm = conversation.Receipts.Values.FirstOrDefault(r =>
                r.ProposalSetId == command.DraftId
                && r.CommandType == CommandType
                && r.Status == CommandReceiptStatus.Succeeded);
            if (firstConfirm?.Result is ConfirmDraftResultDto firstResult)
                return firstResult;

            var set = conversation.CurrentProposalSet;
            if (set is null || set.Id != command.DraftId)
                throw new DraftConflictException(
                    set is null ? "DraftNotFound" : "StaleDraftVersion",
                    "The draft is no longer current.",
                    ConversationSnapshotProjector.ToDto(conversation));

            if (set.Status == ProposalSetStatus.Rejected)
                throw new DraftConflictException("DraftAlreadyRejected", "The draft was rejected.");
            if (set.Status == ProposalSetStatus.Processing)
                throw new DraftConflictException("DraftConfirmationInProgress",
                    "Another confirmation for this draft is in progress.");

            if (conversation.Version != request.ExpectedConversationVersion)
                throw new ConversationVersionConflictException(conversation);
            if (set.Version != request.ExpectedDraftVersion)
                throw new DraftConflictException("StaleDraftVersion",
                    "The draft changed since the client last saw it.",
                    ConversationSnapshotProjector.ToDto(conversation));

            stored = set.Proposals;

            // Field validation runs before the receipt is recorded so a 422 leaves no trace.
            ValidateItemsBelongToSet(request.EditedDraft, stored);

            conversation.RecordReceipt(new CommandReceipt(
                request.CommandId, command.DraftId, CommandType, requestHash,
                CommandReceiptStatus.Pending, null));
            await store.SaveAsync(conversation, ct);
        }

        // ---- Field validation + time resolution ----
        ValidatedProposalSet validated;
        try
        {
            validated = ValidateAndResolve(action.Value, request, stored);
        }
        catch (DraftFieldValidationException)
        {
            await CompleteReceiptAsync(command, CommandReceiptStatus.Failed, null, ct);
            throw;
        }

        // ---- Dispatch (Transaction A -> PersistProposalSet effect -> Transaction B) ----
        Conversation finalConversation;
        try
        {
            finalConversation = await application.DispatchAsync(
                command.UserId,
                command.ConversationId,
                expectedVersion: null, // versions were checked above together with the receipt
                new ConfirmProposalSetRequested(request.CommandId, command.DraftId, action.Value, validated),
                ct);
        }
        catch (Exception)
        {
            await CompleteReceiptAsync(command, CommandReceiptStatus.Failed, null, ct);
            throw;
        }

        // ---- Build + store the result for replays ----
        var finalSet = finalConversation.CurrentProposalSet;
        var succeeded = finalSet is { Status: ProposalSetStatus.Completed };
        var persistedTaskIds = finalSet?.Proposals
            .Where(p => p.PersistedTaskId.HasValue)
            .Select(p => p.PersistedTaskId!.Value)
            .ToList() ?? [];

        var result = new ConfirmDraftResultDto
        {
            CommandId = request.CommandId,
            Status = succeeded ? "succeeded" : "failed",
            ErrorCode = succeeded ? null : "TaskPersistenceFailed",
            PersistedEntities = persistedTaskIds
                .Select(id => new PersistedEntityDto { Kind = "task", Id = id.ToString(CultureInfo.InvariantCulture) })
                .ToList(),
            ClientDirective = succeeded && persistedTaskIds.Count == 1 && action == ConversationAction.StartNow
                ? new ClientDirectiveDto
                {
                    Type = "start_focus",
                    AssociationId = $"task:{persistedTaskIds[0]}",
                    FocusMinutes = validated.FocusMinutes,
                    ReturnToAi = true,
                }
                : null,
            ConversationSnapshot = ConversationSnapshotProjector.ToDto(finalConversation),
        };

        await CompleteReceiptAsync(
            command,
            succeeded ? CommandReceiptStatus.Succeeded : CommandReceiptStatus.Failed,
            succeeded ? result : null, // failed confirms may be retried with a new commandId
            ct);

        return result;
    }

    private static void ValidateItemsBelongToSet(EditedDraftDto edited, IReadOnlyList<TaskProposal> stored)
    {
        var known = stored.Select(p => p.ProposalId).ToHashSet();
        var unknown = edited.Items.FirstOrDefault(i => !known.Contains(i.ItemId));
        if (unknown is not null)
            throw new DraftFieldValidationException("InvalidDraftFields",
                $"Task item {unknown.ItemId} is not on this draft.");

        // A task that was already created must not be dropped from the card: the card is the
        // record of what this confirmation produced.
        var droppedPersisted = stored.FirstOrDefault(p =>
            p.PersistedTaskId.HasValue && edited.Items.All(e => e.ItemId != p.ProposalId));
        if (droppedPersisted is not null)
            throw new DraftFieldValidationException("InvalidDraftFields",
                $"Task item {droppedPersisted.ProposalId} was already saved and cannot be removed.");
    }

    private ValidatedProposalSet ValidateAndResolve(
        ConversationAction action,
        ConfirmDraftRequest request,
        IReadOnlyList<TaskProposal> stored)
    {
        var now = clock.GetUtcNow();
        var storedById = stored.ToDictionary(p => p.ProposalId);

        var proposals = new List<TaskProposal>(request.EditedDraft.Items.Count);
        var toPersist = new List<ValidatedProposalItem>(request.EditedDraft.Items.Count);
        var focusMinutes = 0;

        foreach (var edited in request.EditedDraft.Items)
        {
            var existing = storedById[edited.ItemId];

            // Already a formal task (earlier attempt of this card): keep it exactly as saved.
            if (existing.PersistedTaskId.HasValue)
            {
                proposals.Add(existing);
                continue;
            }

            var title = edited.Title?.Trim() ?? string.Empty;
            if (string.IsNullOrEmpty(title))
                throw new DraftFieldValidationException("InvalidDraftFields", "Title must not be empty.");

            TimeZoneInfo timeZone;
            try
            {
                timeZone = TimeZoneInfo.FindSystemTimeZoneById(edited.TimeZoneId);
            }
            catch (TimeZoneNotFoundException)
            {
                throw new DraftFieldValidationException("InvalidDraftFields", $"Unknown time zone '{edited.TimeZoneId}'.");
            }

            if (!DateOnly.TryParseExact(edited.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var date)
                || !TimeOnly.TryParseExact(edited.StartTime, "HH:mm", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var startTime)
                || !TimeOnly.TryParseExact(edited.EndTime, "HH:mm", CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var endTime))
            {
                throw new DraftFieldValidationException("InvalidDraftFields",
                    "Date must be yyyy-MM-dd and times must be 24-hour HH:mm.");
            }

            var startUtc = ResolveLocal(date, startTime, timeZone);
            var endUtc = ResolveLocal(date, endTime, timeZone);

            var duration = endUtc - startUtc;
            if (duration < TimeSpan.FromMinutes(1))
                throw new DraftFieldValidationException("InvalidDraftFields",
                    "End time must be after start time (at least one minute).");

            // start_now: shift to now, keep the full duration. Only reachable with one item.
            if (action == ConversationAction.StartNow)
            {
                startUtc = now;
                endUtc = now + duration;
                focusMinutes = Math.Min(15, (int)Math.Ceiling(duration.TotalMinutes));
            }

            proposals.Add(new TaskProposal(
                edited.ItemId,
                title,
                string.IsNullOrWhiteSpace(edited.Description) ? null : edited.Description.Trim(),
                date, startTime, endTime, edited.TimeZoneId, edited.LabelId));
            toPersist.Add(new ValidatedProposalItem(edited.ItemId, startUtc, endUtc));
        }

        return new ValidatedProposalSet(proposals, toPersist, focusMinutes);
    }

    private static DateTimeOffset ResolveLocal(DateOnly date, TimeOnly time, TimeZoneInfo timeZone)
    {
        var local = date.ToDateTime(time, DateTimeKind.Unspecified);
        if (timeZone.IsInvalidTime(local))
            throw new DraftFieldValidationException("InvalidDraftFields",
                "That local time does not exist on that date (daylight saving transition). Pick another time.");
        return new DateTimeOffset(local, timeZone.GetUtcOffset(local));
    }

    /// <summary>Canonicalized business fields only — no field order, no transport noise.</summary>
    private static string ComputeRequestHash(Guid draftId, ConfirmDraftRequest request)
    {
        var builder = new StringBuilder();
        builder.Append(draftId).Append('|').Append(request.Action.Trim().ToLowerInvariant());
        foreach (var item in request.EditedDraft.Items.OrderBy(i => i.ItemId))
        {
            builder.Append('|').Append(string.Join('|',
                item.ItemId,
                item.Title?.Trim() ?? "",
                item.Date?.Trim() ?? "",
                item.StartTime?.Trim() ?? "",
                item.EndTime?.Trim() ?? "",
                item.TimeZoneId?.Trim() ?? "",
                item.LabelId?.ToString(CultureInfo.InvariantCulture) ?? ""));
        }
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(builder.ToString())));
    }

    private async Task CompleteReceiptAsync(
        ConfirmDraftCommand command,
        CommandReceiptStatus status,
        ConfirmDraftResultDto? result,
        CancellationToken ct)
    {
        using var _ = await store.AcquireLockAsync(command.ConversationId, ct);
        var conversation = await store.FindAsync(command.ConversationId, ct);
        if (conversation is null)
            return;
        conversation.CompleteReceipt(command.Request.CommandId, status, result);
        await store.SaveAsync(conversation, ct);
    }

    private async Task<Conversation> LoadOwnedAsync(Guid userId, Guid conversationId, CancellationToken ct)
    {
        var conversation = await store.FindAsync(conversationId, ct);
        if (conversation is null || conversation.UserId != userId)
            throw new ConversationNotFoundException();
        return conversation;
    }
}
