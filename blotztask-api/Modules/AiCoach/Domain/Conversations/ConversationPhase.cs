namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>
/// Coarse-grained conversation phase (v3 tech design §6). Only the user-facing dialogue stage
/// lives here; generation progress, proposal-set lifecycle and effect progress are orthogonal
/// dimensions (<see cref="GenerationStatus"/>, <see cref="Proposals.ProposalSetStatus"/>,
/// <see cref="EffectStatus"/>) and must never be expressed by inventing extra phases.
///
/// Wire mapping is FIXED by the schema-2 snapshot protocol the mobile client already speaks
/// (§18 of the previous design): ActionPreparing renders as "clarifying", ActionPending as
/// "draft_pending" and FollowUp as "draft_handled".
/// </summary>
public enum ConversationPhase
{
    Conversing = 0,
    ActionPreparing = 1,
    ActionPending = 2,
    FollowUp = 3,
    Closed = 4,
}

public static class ConversationPhaseExtensions
{
    /// <summary>Protocol-2 state string — the client switch-cases on these exact values.</summary>
    public static string ToWireValue(this ConversationPhase phase) => phase switch
    {
        ConversationPhase.Conversing => "conversing",
        ConversationPhase.ActionPreparing => "clarifying",
        ConversationPhase.ActionPending => "draft_pending",
        ConversationPhase.FollowUp => "draft_handled",
        ConversationPhase.Closed => "closed",
        _ => throw new ArgumentOutOfRangeException(nameof(phase), phase, "Unmapped conversation phase"),
    };
}
