using System.Text.Json;
using BlotzTask.Modules.AiCoach.Capabilities;
using BlotzTask.Modules.AiCoach.Domain;
using BlotzTask.Modules.AiCoach.Modes;
using BlotzTask.Modules.AiCoach.StateMachine;

namespace BlotzTask.Modules.AiCoach.ModelTurn;

public sealed record ProposedArtifactChange(
    Guid ArtifactId,
    ArtifactType Type,
    int SchemaVersion,
    IArtifactDetail Detail);

public sealed record CapabilityExecutionRecord(
    int InvocationIndex,
    CapabilityId CapabilityId,
    bool Succeeded,
    string? RejectionCode);

public sealed class TurnView
{
    private readonly List<CapabilityExecutionRecord> _executions = [];

    public TurnView(ConversationSnapshot baseSnapshot)
    {
        BaseSnapshot = baseSnapshot;
    }

    public ConversationSnapshot BaseSnapshot { get; }
    public ProposedArtifactChange? ProposedArtifact { get; private set; }
    public IReadOnlyList<CapabilityExecutionRecord> Executions => _executions;
    public CurrentArtifactSnapshot? CurrentArtifact => ProposedArtifact is null
        ? BaseSnapshot.CurrentArtifact
        : new CurrentArtifactSnapshot(
            ProposedArtifact.ArtifactId,
            ProposedArtifact.Type,
            ProposedArtifact.SchemaVersion,
            1,
            ArtifactStatus.Pending);

    internal void ProposeArtifact(ProposedArtifactChange proposal)
    {
        if (CurrentArtifact is not null)
            throw new ModelTurnViolationException("artifact_already_proposed_in_current_turn");

        ProposedArtifact = proposal;
    }

    public void RecordExecution(CapabilityExecutionRecord execution)
    {
        if (_executions.Any(item => item.InvocationIndex == execution.InvocationIndex))
            throw new ModelTurnViolationException("duplicate_capability_invocation_index");

        _executions.Add(execution);
    }
}

public sealed class ProposedArtifactBuffer
{
    public ProposedArtifactChange? Artifact { get; private set; }

    public void Propose(ProposedArtifactChange proposal)
    {
        if (Artifact is not null)
            throw new ModelTurnViolationException("artifact_already_proposed_by_capability");
        Artifact = proposal;
    }

    internal void Commit(TurnView turn)
    {
        if (Artifact is not null)
            turn.ProposeArtifact(Artifact);
    }
}

public sealed record ModelTurnLimits(
    int MaxModelIterations,
    int MaxCapabilityCalls,
    int MaxSchemaCorrectionAttempts,
    TimeSpan RequestTimeout)
{
    public static ModelTurnLimits Foundation { get; } = new(4, 2, 1, TimeSpan.FromSeconds(30));
}

public sealed record ModelTurnRequest(
    Guid EffectId,
    ConversationSnapshot Snapshot,
    AiCoachModeDefinition Mode,
    ConversationEvent TriggeringEvent,
    ModelPurpose Purpose,
    TurnObjectiveKey Objective,
    ConsentEvidence? ConsentEvidence,
    ModelTurnLimits Limits);

public enum ModelPurpose { Clarification }
public enum TurnObjectiveKey { ClarifyOneCoreRequirement }
public enum ModelInvariantKey
{
    OneQuestionPerTurn,
    NoArtifact,
    NoSilentSchedule,
    NoBusinessSideEffects,
    StateIsServerControlled
}

public enum ControlledModelOutcomeKind { Reply, Clarification }
public enum ClarificationField { TaskScope, Date, StartTime, Duration }

public sealed record ExplicitScheduleRecommendation(
    string Date,
    string StartTime,
    int DurationMinutes,
    string TimeZoneId);

public sealed record ControlledModelOutcome(
    ControlledModelOutcomeKind Kind,
    string AssistantMessage,
    ClarificationField? MissingField,
    ExplicitScheduleRecommendation? ScheduleRecommendation);

public enum ModelTurnCompletionReason
{
    Completed,
    InvalidInput,
    ConfigurationError,
    CapabilityRejected,
    CapabilityLimitExceeded,
    IterationLimitExceeded,
    QuotaExceeded,
    ContentFiltered,
    RateLimited,
    TimedOut,
    Cancelled,
    ModelUnavailable
}

public sealed record ModelTurnResult(
    ModelTurnCompletionReason CompletionReason,
    ControlledModelOutcome? Outcome,
    TurnView Turn,
    int ModelIterations,
    string? FailureCode)
{
    public bool Succeeded => CompletionReason == ModelTurnCompletionReason.Completed;
}

public sealed record ModelExecutionFrame(
    int Version,
    Guid ConversationId,
    int ConversationVersion,
    AiCoachMode Mode,
    ConversationState State,
    ModelPurpose Purpose,
    TurnObjectiveKey Objective,
    IReadOnlySet<ModelInvariantKey> Invariants,
    IReadOnlySet<CapabilityId> AllowedCapabilities,
    CurrentArtifactSnapshot? CurrentArtifact);

public enum PromptSegmentPlacement { StaticPrefix, DynamicSuffix }
public sealed record PromptSegment(
    string ModuleId,
    int Version,
    PromptSegmentPlacement Placement,
    string Content);
public sealed record AssembledModelPrompt(string PromptVersion, IReadOnlyList<PromptSegment> Segments);

public sealed record ModelMemoryMessage(
    ConversationMessageRole Role,
    int TurnNumber,
    int Sequence,
    string Content);
public sealed record ClarificationProgressSnapshot(int CompletedTurns, string? OpenQuestion);
public sealed record PreparedMemoryContext(
    ConversationState CurrentState,
    ClarificationProgressSnapshot ClarificationProgress,
    IReadOnlyList<ModelMemoryMessage> RecentMessages,
    string UserTimeZoneId,
    string LatestUserMessage);

public sealed record ModelToolCall(
    string ToolName,
    JsonElement Arguments);

public sealed record ModelToolResult(
    int InvocationIndex,
    string ToolName,
    bool Succeeded,
    JsonElement? Output,
    string? RejectionCode);

public sealed record ModelGatewayRequest(
    Guid UserId,
    AssembledModelPrompt Prompt,
    ModelExecutionFrame Frame,
    PreparedMemoryContext Memory,
    IReadOnlyList<ModelToolSchema> Tools,
    IReadOnlyList<ModelToolResult> ToolResults);

public sealed record ModelGatewayResponse(
    ControlledModelOutcome? Outcome,
    IReadOnlyList<ModelToolCall> ToolCalls,
    bool IsComplete,
    string? FailureCode);

public sealed class ModelTurnViolationException(string code) : Exception(code)
{
    public string Code { get; } = code;
}
