using BlotzTask.Modules.AiCoach.Domain.Artifacts;
using BlotzTask.Modules.AiCoach.Domain.Capabilities;
using BlotzTask.Modules.AiCoach.Domain.Conversations;

namespace BlotzTask.Modules.AiCoach.Ai.ModelTurn;

/// <summary>
/// Isolated per-turn scratch state (tech design §21.11). Capability handlers write candidate
/// changes here; nothing touches the conversation aggregate until the kernel commits the
/// turn's result event. Later tool calls in the same turn see earlier proposals (the TurnView),
/// which is what lets the guard deterministically reject a second draft in one turn.
/// </summary>
public sealed class TurnExecutionContext(ConversationSnapshot baseSnapshot, Guid effectId, string timeZoneId)
{
    public ConversationSnapshot BaseSnapshot { get; } = baseSnapshot;
    public Guid EffectId { get; } = effectId;
    public string TimeZoneId { get; } = timeZoneId;

    public TaskDraftPayload? ProposedDraft { get; private set; }

    private readonly List<CapabilityExecutionRecord> _executions = [];
    public IReadOnlyList<CapabilityExecutionRecord> Executions => _executions;

    public void SetProposedDraft(TaskDraftPayload payload)
    {
        if (ProposedDraft is not null)
            throw new InvalidOperationException("A draft was already proposed in this turn.");
        ProposedDraft = payload;
    }

    public void RecordExecution(CapabilityExecutionRecord record) => _executions.Add(record);
}

public sealed record CapabilityExecutionRecord(
    int InvocationIndex,
    string ToolName,
    bool Allowed,
    CapabilityRejectionCode RejectionCode);
