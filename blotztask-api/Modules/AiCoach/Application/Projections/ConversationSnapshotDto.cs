using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;

namespace BlotzTask.Modules.AiCoach.Application.Projections;

public sealed record ConversationSnapshotDto(
    int ProtocolVersion, Guid ConversationId, int ConversationVersion, string Mode,
    string GenerationStatus, string? GenerationError,
    IReadOnlyList<ChatMessageDto> Messages, IReadOnlyList<ArtifactEnvelopeDto> Artifacts,
    IReadOnlyList<string> AllowedActions, DebugUsageDto? DebugUsage);
public sealed record ChatMessageDto(Guid Id, string Role, string Text, bool TaskContextRead);
public sealed record DebugUsageDto(long InputTokens, long OutputTokens, long TotalTokens, decimal? EstUsd);
public sealed record ArtifactEnvelopeDto(Guid Id, int Version, string Status, string? SaveError,
    TaskDraftPayloadDto Payload, IReadOnlyList<string> AllowedActions, ScheduleAssessment? Schedule);
public sealed record TaskDraftPayloadDto(IReadOnlyList<TaskDraftItemDto> Items, int? EstimatedMinutes, int? FocusMinutes);
public sealed record TaskDraftItemDto(Guid ItemId, string Title, string? Description, string? Date,
    string? StartTime, string? EndTime, string TimeZoneId, int? LabelId, int? EstimatedMinutes,
    int? PersistedTaskId, RecurrenceDraftDto? Recurrence);
public sealed record RecurrenceDraftDto(string Frequency, int Interval, int? DaysOfWeek, int? DayOfMonth, string? EndDate);

public static class ConversationSnapshotProjector
{
    public static AiCoachUsageTracker? UsageTracker { get; set; }
    public static AiCoachModuleOptions? UsageOptions { get; set; }

    public static ConversationSnapshotDto ToDto(Conversation conversation)
    {
        var usage = UsageTracker?.Find(conversation.Id);
        var busy = !OperationPolicy.CanStartOperation(conversation);
        return new(5, conversation.Id, conversation.Version, conversation.Mode.ToString(),
            conversation.RunningTurnId.HasValue ? "running" : conversation.GenerationError is null ? "idle" : "failed",
            conversation.GenerationError,
            conversation.Messages.Select(message => new ChatMessageDto(message.Id,
                message.Role == ConversationMessageRole.User ? "user" : "assistant", message.Content,
                message.TaskContextRead)).ToArray(),
            conversation.Drafts.Select(draft => ToDto(draft, busy)).ToArray(),
            busy ? [] : ["send_message"],
            usage is null ? null : new(usage.InputTokens, usage.OutputTokens, usage.TotalTokens,
                usage.EstimateUsd(UsageOptions?.InputTokenUsdPerMillion ?? 0, UsageOptions?.OutputTokenUsdPerMillion ?? 0)));
    }

    private static ArtifactEnvelopeDto ToDto(ProposalSet draft, bool busy)
    {
        var items = draft.Proposals.Select(item => new TaskDraftItemDto(item.ProposalId, item.Title,
            item.Description, item.Date?.ToString("yyyy-MM-dd"), item.StartTime?.ToString("HH:mm"),
            item.EndTime?.ToString("HH:mm"), item.TimeZoneId, item.LabelId, item.EstimatedMinutes,
            item.PersistedTaskId, item.Recurrence is { } recurrence
                ? new RecurrenceDraftDto(recurrence.Frequency.ToString(), recurrence.Interval,
                    recurrence.DaysOfWeek, recurrence.DayOfMonth, recurrence.EndDate?.ToString("yyyy-MM-dd")) : null)).ToArray();
        int? minutes = items.All(item => item.EstimatedMinutes.HasValue) ? items.Sum(item => item.EstimatedMinutes!.Value) : null;
        var actions = OperationPolicy.DraftActions(draft, !busy);
        return new(draft.Id, draft.Version, draft.Status.ToString().ToLowerInvariant(), draft.SaveError,
            new(items, minutes, items.Length == 1 && items[0].Recurrence is null && minutes is > 0
                ? Math.Min(15, minutes.Value) : null), actions, draft.Schedule);
    }
}
