using BlotzTask.Modules.AiCoach.Domain.Artifacts;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Infrastructure;

namespace BlotzTask.Modules.AiCoach.Application.Projections;

/// <summary>
/// The client protocol response body (tech design §18). The shape is FIXED by the design doc;
/// when TS-005 replaces this HTTP transport with SignalR the same body is pushed unchanged.
/// </summary>
public sealed class ConversationSnapshotDto
{
    /// <summary>2: the task_draft payload is a list of items (1 was a single task).</summary>
    public int ProtocolVersion { get; init; } = 2;
    public required Guid ConversationId { get; init; }
    public required int ConversationVersion { get; init; }
    public required string Mode { get; init; }
    public required string State { get; init; }
    public required string GenerationStatus { get; init; }
    public string? BlockedReason { get; init; }
    public string? AssistantMessage { get; init; }
    public ArtifactEnvelopeDto? CurrentArtifact { get; init; }
    public required IReadOnlyList<string> AllowedActions { get; init; }

    /// <summary>
    /// TEMPORARY (Ben, 2026-08-24): running token/cost total of this conversation, surfaced in
    /// the app while testing so token usage is visible without watching the API console.
    /// NOT part of the §18 protocol — remove together with the client's debug line.
    /// </summary>
    public DebugUsageDto? DebugUsage { get; init; }
}

/// <summary>TEMPORARY — see <see cref="ConversationSnapshotDto.DebugUsage"/>.</summary>
public sealed class DebugUsageDto
{
    public required long InputTokens { get; init; }
    public required long OutputTokens { get; init; }
    public required long TotalTokens { get; init; }
    public decimal? EstUsd { get; init; }
}

public sealed class ArtifactEnvelopeDto
{
    public required Guid Id { get; init; }
    public required string Type { get; init; }
    public required int SchemaVersion { get; init; }
    public required int Version { get; init; }
    public required string Status { get; init; }
    public required TaskDraftPayloadDto Payload { get; init; }
}

/// <summary>The card: one or more tasks. The client renders one row per item.</summary>
public sealed class TaskDraftPayloadDto
{
    public required IReadOnlyList<TaskDraftItemDto> Items { get; init; }
    /// <summary>Sum of all items' durations.</summary>
    public required int EstimatedMinutes { get; init; }
    /// <summary>
    /// Server-computed min(15, estimated minutes) preview (requirements §11.1). Only for a
    /// single-task card — a focus timer is for one task, so a multi-task card has none.
    /// </summary>
    public int? FocusMinutes { get; init; }
}

public sealed class TaskDraftItemDto
{
    public required Guid ItemId { get; init; }
    public required string Title { get; init; }
    public string? Description { get; init; }
    /// <summary>yyyy-MM-dd in the conversation's time zone.</summary>
    public required string Date { get; init; }
    /// <summary>24-hour HH:mm.</summary>
    public required string StartTime { get; init; }
    public required string EndTime { get; init; }
    public required string TimeZoneId { get; init; }
    public int? LabelId { get; init; }
    public required int EstimatedMinutes { get; init; }
    /// <summary>Set once this item became a formal task (also after a partially failed confirm).</summary>
    public int? PersistedTaskId { get; init; }
}

public static class ConversationSnapshotProjector
{
    // TEMPORARY (see ConversationSnapshotDto.DebugUsage): set once at startup by the AiCoach
    // module wiring; static because this projector is deliberately a pure static mapper.
    public static AiCoachUsageTracker? UsageTracker { get; set; }
    public static AiCoachModuleOptions? UsageOptions { get; set; }

    public static ConversationSnapshotDto ToDto(Conversation conversation)
    {
        var usage = UsageTracker?.Find(conversation.Id);

        var lastAssistantMessage = conversation.Messages
            .LastOrDefault(m => m.Role == ConversationMessageRole.Assistant)?.Content;

        return new ConversationSnapshotDto
        {
            ConversationId = conversation.Id,
            ConversationVersion = conversation.Version,
            Mode = conversation.Mode switch
            {
                AiCoachMode.Execution => "execution",
                AiCoachMode.Clarify => "clarify",
                AiCoachMode.Companion => "companion",
                _ => "unknown",
            },
            State = conversation.State switch
            {
                ConversationState.Conversing => "conversing",
                ConversationState.Clarifying => "clarifying",
                ConversationState.DraftPending => "draft_pending",
                ConversationState.DraftHandled => "draft_handled",
                ConversationState.Closed => "closed",
                _ => "conversing",
            },
            GenerationStatus = conversation.GenerationStatus switch
            {
                Domain.Conversations.GenerationStatus.Running => "running",
                Domain.Conversations.GenerationStatus.Blocked => "blocked",
                _ => "idle",
            },
            BlockedReason = conversation.BlockedReason switch
            {
                Domain.Conversations.BlockedReason.None => null,
                Domain.Conversations.BlockedReason.Quota => "quota",
                Domain.Conversations.BlockedReason.ContentFiltered => "content_filtered",
                Domain.Conversations.BlockedReason.ModelUnavailable => "model_unavailable",
                Domain.Conversations.BlockedReason.ConfigurationError => "configuration_error",
                _ => "other",
            },
            AssistantMessage = lastAssistantMessage,
            CurrentArtifact = ToEnvelopeDto(conversation.CurrentArtifact),
            AllowedActions = conversation.AllowedActions
                .Select(a => a.ToWireValue())
                .OrderBy(a => a, StringComparer.Ordinal)
                .ToList(),
            DebugUsage = usage is null
                ? null
                : new DebugUsageDto
                {
                    InputTokens = usage.InputTokens,
                    OutputTokens = usage.OutputTokens,
                    TotalTokens = usage.TotalTokens,
                    EstUsd = usage.EstimateUsd(
                        UsageOptions?.InputTokenUsdPerMillion ?? 0,
                        UsageOptions?.OutputTokenUsdPerMillion ?? 0),
                },
        };
    }

    private static ArtifactEnvelopeDto? ToEnvelopeDto(ConversationArtifact? artifact)
    {
        if (artifact?.Payload is not TaskDraftPayload draft)
            return null;

        var items = draft.Items.Select(item =>
        {
            var minutes = (int)Math.Ceiling(
                (item.EndTime.ToTimeSpan() - item.StartTime.ToTimeSpan()).TotalMinutes);
            return new TaskDraftItemDto
            {
                ItemId = item.ItemId,
                Title = item.Title,
                Description = item.Description,
                Date = item.Date.ToString("yyyy-MM-dd"),
                StartTime = item.StartTime.ToString("HH:mm"),
                EndTime = item.EndTime.ToString("HH:mm"),
                TimeZoneId = item.TimeZoneId,
                LabelId = item.LabelId,
                EstimatedMinutes = minutes,
                PersistedTaskId = item.PersistedTaskId,
            };
        }).ToList();

        var totalMinutes = items.Sum(i => i.EstimatedMinutes);

        return new ArtifactEnvelopeDto
        {
            Id = artifact.Id,
            Type = artifact.Type.ToWireValue(),
            SchemaVersion = artifact.SchemaVersion,
            Version = artifact.Version,
            Status = artifact.Status.ToWireValue(),
            Payload = new TaskDraftPayloadDto
            {
                Items = items,
                EstimatedMinutes = totalMinutes,
                FocusMinutes = draft.IsSingle ? Math.Min(15, Math.Max(1, totalMinutes)) : null,
            },
        };
    }
}
