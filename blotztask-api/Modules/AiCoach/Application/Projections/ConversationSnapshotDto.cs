using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;

namespace BlotzTask.Modules.AiCoach.Application.Projections;

public sealed record ConversationSnapshotDto(
    int ProtocolVersion, Guid ConversationId, int ConversationVersion,
    string GenerationStatus, string? GenerationError,
    IReadOnlyList<ChatMessageDto> Messages, IReadOnlyList<ArtifactEnvelopeDto> Artifacts,
    IReadOnlyList<string> AllowedActions, DebugUsageDto? DebugUsage,
    ArtifactEnvelopeDto? PendingList = null, IReadOnlyList<string>? FollowUps = null);
public sealed record ChatMessageDto(Guid Id, string Role, string Text, bool TaskContextRead,
    DateTimeOffset CreatedAt, bool TopicStart, IReadOnlyList<ArtifactEnvelopeDto> DraftSnapshot);
public sealed record DebugUsageDto(long InputTokens, long OutputTokens, long TotalTokens, decimal? EstUsd);
public sealed record ArtifactEnvelopeDto(Guid Id, int Version, string Status, string? SaveError,
    TaskDraftPayloadDto Payload, IReadOnlyList<string> AllowedActions, ScheduleAssessment? Schedule,
    bool IsReviewList = false, bool CanConfirm = false, IReadOnlyList<string>? ValidationErrors = null);
public sealed record TaskDraftPayloadDto(IReadOnlyList<TaskDraftItemDto> Items, int? EstimatedMinutes, int? FocusMinutes);
public sealed record TaskDraftItemDto(Guid ItemId, string Title, string? Description, string? Date,
    string? StartTime, string? EndTime, string TimeZoneId, int? LabelId, int? EstimatedMinutes,
    int? PersistedTaskId, RecurrenceDraftDto? Recurrence, string Kind = "task",
    Guid? PersistedNoteId = null, IReadOnlyList<string>? SuggestedFields = null);
public sealed record RecurrenceDraftDto(string Frequency, int Interval, int? DaysOfWeek, int? DayOfMonth, string? EndDate);

public static class ConversationSnapshotProjector
{
    public static AiCoachUsageTracker? UsageTracker { get; set; }
    public static AiCoachModuleOptions? UsageOptions { get; set; }

    public static ConversationSnapshotDto ToDto(Conversation conversation)
    {
        var usage = UsageTracker?.Find(conversation.Id);
        var busy = !OperationPolicy.CanStartOperation(conversation);
        return new(5, conversation.Id, conversation.Version,
            conversation.RunningTurnId.HasValue ? "running" : conversation.GenerationError is null ? "idle" : "failed",
            conversation.GenerationError,
            conversation.Messages.TakeLast(30).Select(message => new ChatMessageDto(message.Id,
                message.Role == ConversationMessageRole.User ? "user" : "assistant", message.Content,
                message.TaskContextRead, message.CreatedAt, message.Id == conversation.Messages.FirstOrDefault()?.Id,
                (message.DraftSnapshot ?? []).Select(draft => ToDto(draft, true)).ToArray())).ToArray(),
            conversation.Drafts.Select(draft => ToDto(draft, busy)).ToArray(),
            busy ? [] : ["send_message"],
            usage is null ? null : new(usage.InputTokens, usage.OutputTokens, usage.TotalTokens,
                usage.EstimateUsd(UsageOptions?.InputTokenUsdPerMillion ?? 0, UsageOptions?.OutputTokenUsdPerMillion ?? 0)),
            conversation.Drafts.Where(draft => draft.IsReviewList
                && draft.Status is ProposalSetStatus.Pending or ProposalSetStatus.Processing)
                .Select(draft => ToDto(draft, busy)).SingleOrDefault(),
            conversation.RunningTurnId.HasValue ? [] : conversation.FollowUps);
    }

    public static ArtifactEnvelopeDto ToDto(ProposalSet draft, bool busy)
    {
        var items = draft.Proposals.Select(item => new TaskDraftItemDto(item.ProposalId, item.Title,
            item.Description, item.Date?.ToString("yyyy-MM-dd"), item.StartTime?.ToString("HH:mm"),
            item.EndTime?.ToString("HH:mm"), item.TimeZoneId, item.LabelId, item.EstimatedMinutes,
            item.PersistedTaskId, item.Recurrence is { } recurrence
                ? new RecurrenceDraftDto(recurrence.Frequency.ToString(), recurrence.Interval,
                    recurrence.DaysOfWeek, recurrence.DayOfMonth, recurrence.EndDate?.ToString("yyyy-MM-dd")) : null,
            item.Kind.ToString().ToLowerInvariant(), item.PersistedNoteId, item.SuggestedFields ?? [])).ToArray();
        int? minutes = items.All(item => item.EstimatedMinutes.HasValue) ? items.Sum(item => item.EstimatedMinutes!.Value) : null;
        var actions = OperationPolicy.DraftActions(draft, !busy);
        var errors = ConfirmationErrors(draft);
        if (draft.Schedule?.Status == "unverified") errors.Add("ScheduleUnverified");
        if (draft.Schedule?.Status == "conflict") errors.Add("ScheduleConflict");
        return new(draft.Id, draft.Version, draft.Status.ToString().ToLowerInvariant(), draft.SaveError,
            new(items, minutes, items.Length == 1 && items[0].Kind == "task" && items[0].Recurrence is null && minutes is > 0
                ? Math.Min(15, minutes.Value) : null), actions, draft.Schedule, draft.IsReviewList,
            !busy && draft.Status == ProposalSetStatus.Pending && items.Length > 0 && errors.Count == 0, errors);
    }

    private static List<string> ConfirmationErrors(ProposalSet draft)
    {
        var errors = new List<string>();
        foreach (var item in draft.Proposals.Where(item => !item.IsSaved))
        {
            if (item.Kind == ProposalKind.Note) continue;
            if (item.Date is not { } date || item.StartTime is not { } start || item.EndTime is not { } end)
            {
                errors.Add($"ScheduleRequired:{item.ProposalId}");
                continue;
            }
            try
            {
                var zone = TimeZoneInfo.FindSystemTimeZoneById(item.TimeZoneId);
                var from = Application.Commands.DraftEditing.ResolveLocal(date, start, zone);
                var until = Application.Commands.DraftEditing.ResolveLocal(date, end, zone);
                if (until <= from) errors.Add($"InvalidDraftFields:{item.ProposalId}");
                else if (from < DateTimeOffset.UtcNow) errors.Add($"ScheduleInPast:{item.ProposalId}");
            }
            catch (Exception error) when (error is TimeZoneNotFoundException or InvalidTimeZoneException
                or ArgumentException or Application.Commands.DraftFieldValidationException)
            {
                errors.Add($"InvalidDraftFields:{item.ProposalId}");
            }
        }
        return errors;
    }
}
