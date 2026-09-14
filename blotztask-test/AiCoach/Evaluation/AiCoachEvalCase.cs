using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Policy;

namespace BlotzTask.Tests.AiCoach.Evaluation;

/// <summary>
/// Minimal case contract for the lightweight architecture-feasibility evaluation (eval plan §5.1).
/// A case declares what is Required / Allowed / Forbidden — never a golden reply text (§4.4).
/// </summary>
public sealed record AiCoachEvalCase(
    string Id,
    string Title,
    AiCoachMode Mode,
    IReadOnlyList<EvalTurn> Turns);

public sealed record EvalTurn(
    string UserMessage,
    IReadOnlySet<ConversationStrategy> AllowedStrategies,
    QuestionExpectation Question,
    ProposalExpectation Proposal,
    IReadOnlyList<string> MustAddress,
    IReadOnlyList<string> MustNotDo,
    StateExpectation? StateAfter = null,
    IReadOnlyList<string>? ReplyMustNotContain = null);

public enum QuestionPolicy
{
    Required,
    Allowed,
    Forbidden,
}

public enum ProposalPolicy
{
    Required,
    Allowed,
    Forbidden,
}

public sealed record QuestionExpectation(
    QuestionPolicy Policy,
    ClarificationTopic? ExpectedTopic = null,
    bool MustNotRepeatPreviousQuestion = true)
{
    public static readonly QuestionExpectation Required = new(QuestionPolicy.Required);
    public static readonly QuestionExpectation Allowed = new(QuestionPolicy.Allowed);
    public static readonly QuestionExpectation Forbidden = new(QuestionPolicy.Forbidden);
}

public sealed record ProposalExpectation(
    ProposalPolicy Policy,
    int? ExpectedCount = null,
    int? MaxCount = null,
    IReadOnlyList<DateOnly>? ExpectedDates = null,
    TimeOnly? ExpectedStartTime = null,
    int? ExpectedDurationMinutes = null)
{
    public static readonly ProposalExpectation Required = new(ProposalPolicy.Required);
    public static readonly ProposalExpectation Allowed = new(ProposalPolicy.Allowed);
    public static readonly ProposalExpectation Forbidden = new(ProposalPolicy.Forbidden);
}

/// <summary>Authoritative state the turn must leave behind (asserted on the real Kernel's snapshot).</summary>
public sealed record StateExpectation(
    ConversationPhase? Phase = null,
    bool? HasPendingProposalSet = null,
    bool? HasOpenQuestion = null,
    bool? HasSupportPreference = null);

public enum CheckSeverity
{
    /// <summary>Hard rule (§4.3): can never be offset by a good judge score.</summary>
    Hard,

    /// <summary>Soft quality signal: recorded and reported, never fails the case on its own.</summary>
    Soft,
}

public sealed record EvalCheckResult(
    string Id,
    string Category,
    CheckSeverity Severity,
    bool Passed,
    string Expected,
    string Actual)
{
    public override string ToString() =>
        $"{(Passed ? "ok  " : "FAIL")} [{Severity}] {Id}: expected {Expected}; actual {Actual}";
}
