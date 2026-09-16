using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Policy;

namespace BlotzTask.Modules.AiCoach.Domain.Support;

public enum SupportDecisionReason
{
    DefaultListening = 0,
    ExplicitListeningPreference = 1,
    ExplicitExplorationRequest = 2,
    ExplicitPerspectiveRequest = 3,
    ExplicitAdviceRequest = 4,
    AdviceRejected = 5,
    QuestionCadenceExhausted = 6,
    PauseRequested = 7,
}

public sealed record SupportDecision(
    IReadOnlySet<SupportMove> AllowedMoves,
    IReadOnlyList<SupportDecisionReason> Reasons,
    SupportPreferenceSnapshot? PreferenceUpdate = null,
    bool ClearPreference = false)
{
    public bool Allows(SupportMove move) => AllowedMoves.Contains(move);
}

public sealed record SupportPolicyContext(
    ConversationSnapshot Snapshot,
    VerifiedSupportRequest? CurrentRequest,
    ConversationStrategy? PreviousAssistantStrategy,
    Guid? CurrentMessageId,
    SupportPolicyDefinition Policy);

public interface ISupportPolicyCalculator
{
    SupportDecision Calculate(SupportPolicyContext context);
}

/// <summary>
/// Pure Companion support policy. It decides which response moves are allowed; Post-Policy
/// remains the sole owner of the final conversation strategy.
/// </summary>
public sealed class SupportPolicyCalculator : ISupportPolicyCalculator
{
    public SupportDecision Calculate(SupportPolicyContext context)
    {
        var current = context.CurrentRequest;
        var currentKind = current?.Kind ?? SupportRequestKind.Unspecified;
        var storedKind = context.Snapshot.CompanionContext?.ExplicitPreference?.Kind;
        var effectiveKind = currentKind is SupportRequestKind.Unspecified
            ? storedKind ?? SupportRequestKind.Unspecified
            : currentKind;

        var preferenceUpdate = BuildPreferenceUpdate(context, current);
        var clearPreference = currentKind == SupportRequestKind.ClearsPreference;

        return effectiveKind switch
        {
            SupportRequestKind.WantsListening => Decision(
                [SupportMove.Acknowledge, SupportMove.Reflect],
                [SupportDecisionReason.ExplicitListeningPreference], preferenceUpdate),
            SupportRequestKind.WantsExploration => Decision(
                DefaultMoves(), [SupportDecisionReason.ExplicitExplorationRequest], preferenceUpdate),
            SupportRequestKind.WantsPerspective => Decision(
                DefaultMoves(), [SupportDecisionReason.ExplicitPerspectiveRequest], preferenceUpdate),
            SupportRequestKind.WantsAdvice => Decision(
                DefaultMoves(), [SupportDecisionReason.ExplicitAdviceRequest], preferenceUpdate),
            SupportRequestKind.RejectsAdvice => Decision(
                DefaultMoves().Where(move => move != SupportMove.OfferAdvice).ToList(),
                [SupportDecisionReason.AdviceRejected], preferenceUpdate),
            SupportRequestKind.WantsPause => Decision(
                [SupportMove.Acknowledge, SupportMove.RespectPause],
                [SupportDecisionReason.PauseRequested], preferenceUpdate),
            SupportRequestKind.ClearsPreference => DefaultDecision(clearPreference: true),
            _ => DefaultDecision(),
        };
    }

    // Cadence and positive response preferences guide the model; they do not veto a useful
    // response. Only explicit restrictions above narrow the available conversational moves.
    private static IReadOnlyList<SupportMove> DefaultMoves() =>
        [SupportMove.Acknowledge, SupportMove.Reflect, SupportMove.OfferPerspective,
            SupportMove.OfferAdvice, SupportMove.GentleQuestion];

    private static SupportDecision DefaultDecision(
        bool clearPreference = false) =>
        new(DefaultMoves().ToHashSet(), [SupportDecisionReason.DefaultListening],
            ClearPreference: clearPreference);

    private static SupportPreferenceSnapshot? BuildPreferenceUpdate(
        SupportPolicyContext context,
        VerifiedSupportRequest? request)
    {
        if (request is null
            || request.Scope != SupportPreferenceScope.Conversation
            || request.Kind is SupportRequestKind.Unspecified or SupportRequestKind.ClearsPreference
                or SupportRequestKind.WantsPause
            || string.IsNullOrWhiteSpace(request.EvidenceQuote)
            || context.CurrentMessageId is null)
        {
            return null;
        }

        return new SupportPreferenceSnapshot(
            request.Kind,
            context.CurrentMessageId.Value,
            request.EvidenceQuote,
            context.Snapshot.Version + 1L);
    }

    private static SupportDecision Decision(
        IReadOnlyList<SupportMove> moves,
        IReadOnlyList<SupportDecisionReason> reasons,
        SupportPreferenceSnapshot? preferenceUpdate) =>
        new(moves.ToHashSet(), reasons, preferenceUpdate);
}
