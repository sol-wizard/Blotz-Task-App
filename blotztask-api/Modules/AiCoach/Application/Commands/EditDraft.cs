using BlotzTask.Modules.AiCoach.Domain.Policy;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.AiCoach.Application.Queries;

namespace BlotzTask.Modules.AiCoach.Application.Commands;

public sealed record EditDraftRequest(int ExpectedConversationVersion, int ExpectedDraftVersion, EditedDraftDto EditedDraft);

/// <summary>Save card edits as draft data, so the next model turn sees exactly what the user sees.</summary>
public sealed class EditDraftCommandHandler(IConversationStore store,
    DraftScheduleChecker? scheduleChecker = null, AiCoachTraceRecorder? trace = null)
{
    public async Task<ConversationSnapshotDto> Handle(Guid userId, Guid conversationId, Guid draftId,
        EditDraftRequest request, CancellationToken ct)
    {
        IReadOnlyList<TaskProposal> items;
        using (await store.AcquireLockAsync(conversationId, ct))
        {
            var current = await ConversationApplication.LoadOwnedAsync(store, userId, conversationId, ct);
            var original = DraftEditing.Find(current, draftId);
            DraftEditing.CheckEditable(current, original, request.ExpectedConversationVersion, request.ExpectedDraftVersion);
            items = DraftEditing.Apply(request.EditedDraft, original);
        }
        var assessment = scheduleChecker is null ? null
            : await scheduleChecker.CheckAsync(userId, items, false, ct);
        ConversationSnapshotDto snapshot;
        using (await store.AcquireLockAsync(conversationId, ct))
        {
            var conversation = await ConversationApplication.LoadOwnedAsync(store, userId, conversationId, ct);
            var draft = DraftEditing.Find(conversation, draftId);
            DraftEditing.CheckEditable(conversation, draft, request.ExpectedConversationVersion, request.ExpectedDraftVersion);
            draft.Replace(items);
            if (assessment is not null) draft.SetSchedule(assessment);
            conversation.RecordDraftEvent("edited_by_user", draft);
            await store.SaveAsync(conversation, ct);
            snapshot = ConversationSnapshotProjector.ToDto(conversation);
        }
        if (trace is not null) await trace.RecordAsync(userId, conversationId, null, "draft_edited", new
        {
            draftId, items, assessment, snapshot.ConversationVersion,
        });
        return snapshot;
    }
}

internal static class DraftEditing
{
    public static string Hash<T>(T value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(value))));

    public static ProposalSet Find(Conversation conversation, Guid id) => conversation.Drafts.SingleOrDefault(draft => draft.Id == id)
        ?? throw new DraftConflictException("DraftNotFound", "Draft does not belong to this conversation.", ConversationSnapshotProjector.ToDto(conversation));

    public static void CheckEditable(Conversation conversation, ProposalSet draft, int version, int? draftVersion = null)
    {
        ConversationApplication.RequireIdle(conversation);
        if (conversation.Version != version) throw new ConversationVersionConflictException(conversation);
        if (draftVersion.HasValue && draft.Version != draftVersion)
            throw new DraftConflictException("StaleDraftVersion", "Draft changed.", ConversationSnapshotProjector.ToDto(conversation));
        if (!OperationPolicy.CanEdit(draft))
            throw new DraftConflictException("DraftNotEditable", "Draft is not pending.", ConversationSnapshotProjector.ToDto(conversation));
    }

    public static IReadOnlyList<TaskProposal> Apply(EditedDraftDto edited, ProposalSet draft)
    {
        if (edited?.Items is null || edited.Items.Count == 0)
            throw Invalid("Keep at least one item, or discard the draft.");
        if (edited.Items.Select(item => item.ItemId).Distinct().Count() != edited.Items.Count)
            throw Invalid("Duplicate item IDs.");
        var known = draft.Proposals.ToDictionary(item => item.ProposalId);
        if (known.Values.Any(item => item.PersistedTaskId.HasValue && edited.Items.All(value => value.ItemId != item.ProposalId)))
            throw Invalid("Saved items cannot be removed.");
        var result = edited.Items.Select(item =>
        {
            if (!known.TryGetValue(item.ItemId, out var original)) throw Invalid("Unknown draft item.");
            if (!OperationPolicy.CanEditItem(original)) return original;
            if (string.IsNullOrWhiteSpace(item.Title)) throw Invalid("Title is required.");
            if (item.LabelId != original.LabelId) throw Invalid("Label cannot be changed through this draft editor.");
            DateOnly? date = null;
            TimeOnly? start = null;
            TimeOnly? end = null;
            if (item.Date is not null)
            {
                if (!DateOnly.TryParseExact(item.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed)) throw Invalid("Invalid date.");
                date = parsed;
            }
            if (item.StartTime is not null)
            {
                if (!TimeOnly.TryParseExact(item.StartTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed)) throw Invalid("Invalid start time.");
                start = parsed;
            }
            if (item.EndTime is not null)
            {
                if (!TimeOnly.TryParseExact(item.EndTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsed)) throw Invalid("Invalid end time.");
                end = parsed;
            }
            if (start.HasValue && end.HasValue && end <= start) throw Invalid("End must be after start.");
            // Time zone is session-owned; the editor cannot silently reinterpret local times.
            if (item.TimeZoneId != original.TimeZoneId) throw Invalid("Draft time zone cannot be changed.");
            RecurrenceProposal? recurrence = null;
            if (item.Recurrence is { } rule)
            {
                if (!Enum.TryParse<RecurrenceFrequency>(rule.Frequency, false, out var frequency) || !Enum.IsDefined(frequency))
                    throw Invalid("Invalid recurrence frequency.");
                DateOnly? endDate = null;
                if (rule.EndDate is not null)
                {
                    if (!DateOnly.TryParseExact(rule.EndDate, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                        DateTimeStyles.None, out var parsed)) throw Invalid("Invalid recurrence end date.");
                    endDate = parsed;
                }
                recurrence = new(frequency, rule.Interval, rule.DaysOfWeek, rule.DayOfMonth, endDate);
                try { DraftTools.ValidateRecurrence(recurrence, date); }
                catch (ArgumentException ex) { throw Invalid(ex.Message); }
            }
            if ((original.Recurrence is null) != (recurrence is null))
                throw Invalid("Draft kind cannot be changed through this editor.");
            return original with { Title = item.Title.Trim(), Description = item.Description, Date = date, StartTime = start, EndTime = end, Recurrence = recurrence };
        }).ToArray();
        try { DraftTools.CheckDraftShape(result); }
        catch (ArgumentException ex) { throw Invalid(ex.Message); }
        return result;
    }

    public static DateTimeOffset ResolveLocal(DateOnly date, TimeOnly time, TimeZoneInfo zone)
    {
        var local = date.ToDateTime(time, DateTimeKind.Unspecified);
        if (zone.IsInvalidTime(local) || zone.IsAmbiguousTime(local))
            throw Invalid("Choose an unambiguous local time outside the daylight-saving transition.");
        return new DateTimeOffset(local, zone.GetUtcOffset(local));
    }
    private static DraftFieldValidationException Invalid(string message) => new("InvalidDraftFields", message);
}
