using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Domain.Guards;

/// <summary>
/// Evidence Guard (v3 tech design §14.1). Planning claims must carry literal quotes from the
/// current user message. Prototype semantic checks remain fail-closed where explicitly retained;
/// readiness and strategy remain owned by their dedicated policy layers.
/// </summary>
public interface IEvidenceGuard
{
    VerifiedPlanningContext Verify(InterpretationCandidate interpretation, string currentUserMessage);
}

public sealed class EvidenceGuard : IEvidenceGuard
{
    public VerifiedPlanningContext Verify(InterpretationCandidate interpretation, string currentUserMessage)
    {
        var issues = new List<EvidenceIssue>();
        var verifiedItems = new List<VerifiedPlanningItem>();
        var verifiedConstraints = new List<VerifiedConstraint>();
        var submittedClaims = 0;
        var verifiedDispositionClaims = 0;
        VerifiedActionRequest? verifiedActionRequest = null;
        VerifiedSupportRequest? verifiedSupportRequest = null;

        foreach (var item in interpretation.PlanningItems ?? [])
        {
            submittedClaims++;
            if (string.IsNullOrWhiteSpace(item.Text)
                || string.IsNullOrWhiteSpace(item.Evidence.Quote))
            {
                issues.Add(string.IsNullOrWhiteSpace(item.Text)
                    ? EvidenceIssue.EmptyClaim
                    : EvidenceIssue.MissingQuote);
                continue;
            }

            if (!ContainsQuote(currentUserMessage, item.Evidence.Quote))
            {
                issues.Add(EvidenceIssue.QuoteNotFound);
                continue;
            }

            if (!ContainsQuote(item.Evidence.Quote, item.Text))
            {
                issues.Add(EvidenceIssue.ClaimNotSupportedByQuote);
                continue;
            }

            verifiedItems.Add(new VerifiedPlanningItem(
                item.Text.Trim(), item.Kind, item.Evidence.Quote.Trim()));
        }

        foreach (var constraint in interpretation.Constraints ?? [])
        {
            submittedClaims++;
            if (string.IsNullOrWhiteSpace(constraint.Text)
                || string.IsNullOrWhiteSpace(constraint.Evidence.Quote))
            {
                issues.Add(string.IsNullOrWhiteSpace(constraint.Text)
                    ? EvidenceIssue.EmptyClaim
                    : EvidenceIssue.MissingQuote);
                continue;
            }

            if (!ContainsQuote(currentUserMessage, constraint.Evidence.Quote))
            {
                issues.Add(EvidenceIssue.QuoteNotFound);
                continue;
            }

            if (!ContainsQuote(constraint.Evidence.Quote, constraint.Text))
            {
                issues.Add(EvidenceIssue.ClaimNotSupportedByQuote);
                continue;
            }

            verifiedConstraints.Add(new VerifiedConstraint(
                constraint.Text.Trim(), constraint.Evidence.Quote.Trim()));
        }

        var disposition = UserTurnDisposition.NotApplicable;
        if (interpretation.Disposition is { Kind: not UserTurnDisposition.NotApplicable } candidateDisposition)
        {
            submittedClaims++;
            if (string.IsNullOrWhiteSpace(candidateDisposition.Evidence?.Quote))
            {
                issues.Add(EvidenceIssue.MissingQuote);
            }
            else if (!ContainsQuote(currentUserMessage, candidateDisposition.Evidence.Quote))
            {
                issues.Add(EvidenceIssue.QuoteNotFound);
            }
            else
            {
                disposition = candidateDisposition.Kind;
                verifiedDispositionClaims++;
            }
        }

        if (interpretation.ActionRequest is not null)
        {
            if (interpretation.ActionRequest.Kind != ActionRequestKind.None)
                submittedClaims++;
            verifiedActionRequest = VerifyActionRequest(
                interpretation.ActionRequest, currentUserMessage, issues, ref verifiedDispositionClaims);
        }

        if (interpretation.SupportRequest is not null)
        {
            if (interpretation.SupportRequest.Kind != SupportRequestKind.Unspecified)
                submittedClaims++;
            verifiedSupportRequest = VerifySupportRequest(
                interpretation.SupportRequest, currentUserMessage, issues, ref verifiedDispositionClaims);
        }

        return new VerifiedPlanningContext(
            verifiedItems,
            verifiedConstraints,
            disposition,
            new EvidenceSummary(
                submittedClaims,
                verifiedItems.Count + verifiedConstraints.Count + verifiedDispositionClaims,
                issues),
            verifiedActionRequest,
            verifiedSupportRequest);
    }

    private static VerifiedActionRequest? VerifyActionRequest(
        ActionRequestCandidate candidate,
        string currentUserMessage,
        List<EvidenceIssue> issues,
        ref int verifiedClaims)
    {
        if (candidate.Kind == ActionRequestKind.None)
            return new VerifiedActionRequest(ActionRequestKind.None, null);

        if (!TryVerifyQuote(candidate.Evidence, currentUserMessage, issues, out var quote))
            return null;

        verifiedClaims++;
        return new VerifiedActionRequest(candidate.Kind, quote);
    }

    private static VerifiedSupportRequest? VerifySupportRequest(
        SupportRequestCandidate candidate,
        string currentUserMessage,
        List<EvidenceIssue> issues,
        ref int verifiedClaims)
    {
        if (candidate.Kind == SupportRequestKind.Unspecified)
            return new VerifiedSupportRequest(SupportRequestKind.Unspecified, null);

        if (!TryVerifyQuote(candidate.Evidence, currentUserMessage, issues, out var quote))
            return null;

        // A turn-scoped advice request is non-persistent and has no formal side effect. Once its
        // literal current-message quote is verified, open-language interpretation remains model-owned;
        // the prototype keyword list must not override it. Conversation-scoped preferences retain
        // the conservative prototype check because they affect later turns.
        if ((candidate.Kind != SupportRequestKind.WantsAdvice
             || candidate.Scope != SupportPreferenceScope.Turn)
            && !SupportRequestEvidenceMatches(candidate.Kind, quote!))
        {
            issues.Add(EvidenceIssue.ClaimNotSupportedByQuote);
            return null;
        }

        verifiedClaims++;
        return new VerifiedSupportRequest(candidate.Kind, quote, candidate.Scope);
    }

    /// <summary>
    /// Fail-closed verifier for the two currently supported locales. These markers establish
    /// that the quote is about how the assistant should respond, rather than merely being an
    /// emotional statement that the model chose to answer by listening.
    /// </summary>
    private static bool SupportRequestEvidenceMatches(SupportRequestKind kind, string quote)
    {
        var text = Normalize(quote).ToLowerInvariant();
        var rejectsAdvice = ContainsAny(text,
            "不要建议", "不用建议", "别建议", "不需要建议",
            "noadvice", "don'tadvise", "donotadvise", "don'twantadvice",
            "donotwantadvice", "notlookingforadvice");
        var rejectsQuestions = ContainsAny(text,
            "别问", "不要问", "不想回答", "stopasking", "don'task", "donotask");
        var clearsPreference = ContainsAny(text,
            "恢复默认", "之前说的不用管", "可以问", "可以建议", "清除偏好",
            "forgetthat", "clearmypreference", "youcanask", "adviceisokay");

        return kind switch
        {
            SupportRequestKind.WantsListening => ContainsAny(text,
                "听我", "听着", "听就好", "只想说", "让我说", "倾听",
                "listen", "hearmeout", "letmevent", "justvent"),
            SupportRequestKind.WantsExploration => !rejectsQuestions && !clearsPreference && ContainsAny(text,
                "问我", "一起想", "陪我想", "帮我想", "探索", "聊聊为什么",
                "askme", "explore", "thinkthrough"),
            SupportRequestKind.WantsPerspective => ContainsAny(text,
                "你怎么看", "你的看法", "你的观点", "你觉得呢",
                "whatdoyouthink", "yourperspective", "yourview"),
            SupportRequestKind.WantsAdvice => !rejectsAdvice && !clearsPreference && ContainsAny(text,
                "建议", "怎么办", "怎么做", "我该", "该怎么",
                "whatshouldi", "advice", "suggest"),
            SupportRequestKind.RejectsAdvice => rejectsAdvice,
            SupportRequestKind.WantsPause => ContainsAny(text,
                "先停", "暂停", "别问", "不要问", "不想聊", "安静",
                "pause", "stopasking", "don'task", "donotask", "quiet"),
            SupportRequestKind.ClearsPreference => clearsPreference,
            _ => false,
        };
    }

    private static bool ContainsAny(string text, params string[] markers) =>
        markers.Any(marker => text.Contains(marker, StringComparison.OrdinalIgnoreCase));

    private static bool TryVerifyQuote(
        EvidenceReference? evidence,
        string currentUserMessage,
        List<EvidenceIssue> issues,
        out string? quote)
    {
        quote = evidence?.Quote?.Trim();
        if (string.IsNullOrWhiteSpace(quote))
        {
            issues.Add(EvidenceIssue.MissingQuote);
            return false;
        }

        if (!ContainsQuote(currentUserMessage, quote))
        {
            issues.Add(EvidenceIssue.QuoteNotFound);
            return false;
        }

        return true;
    }

    private static bool ContainsQuote(string message, string quote) =>
        Normalize(message).Contains(Normalize(quote), StringComparison.OrdinalIgnoreCase);

    private static string Normalize(string text) =>
        string.Concat(text.Where(c => !char.IsWhiteSpace(c)));
}

/// <summary>
/// Response Guard (v3 tech design §14.2). It validates only what is determinable structure —
/// non-empty text within the length budget — and never attempts to fully understand free text;
/// type-to-strategy matching and the one-question rule are enforced structurally upstream
/// (output schema + Post-Policy).
/// </summary>
public interface IResponseGuard
{
    ResponseVerdict Validate(AssistantResponseCandidate response, ResponseConstraints constraints);
}

public sealed record ResponseVerdict(bool IsValid, string? Detail)
{
    public static readonly ResponseVerdict Valid = new(true, null);

    public static ResponseVerdict Invalid(string detail) => new(false, detail);
}

public sealed class ResponseGuard : IResponseGuard
{
    public ResponseVerdict Validate(AssistantResponseCandidate response, ResponseConstraints constraints)
    {
        if (string.IsNullOrWhiteSpace(response.Text))
            return ResponseVerdict.Invalid("Empty assistant text.");

        if (response.Text.Length > constraints.MaxResponseLength)
            return ResponseVerdict.Invalid($"Assistant text exceeds {constraints.MaxResponseLength} characters.");

        return ResponseVerdict.Valid;
    }
}

/// <summary>
/// ProposalSet Guard (v3 tech design §14.3): field-level and domain validation of an accepted
/// candidate, materializing the server-owned <see cref="TaskProposal"/> list (ProposalIds and
/// the conversation time zone are assigned HERE — the model never supplies identity fields).
/// Rejection discards the WHOLE candidate: a half-valid card is never persisted (§11).
/// </summary>
public interface IProposalSetGuard
{
    ProposalSetVerdict Validate(
        ProposalSetCandidate candidate,
        ConversationSnapshot snapshot,
        ProposalConstraints constraints,
        string conversationTimeZoneId);
}

public sealed record ProposalSetVerdict(
    IReadOnlyList<TaskProposal>? Proposals,
    string? Detail)
{
    public bool IsValid => Proposals is not null;

    public static ProposalSetVerdict Invalid(string detail) => new(null, detail);
}

public sealed class ProposalSetGuard : IProposalSetGuard
{
    public const int MaxTitleLength = 120;
    public const int MaxDurationMinutes = 12 * 60;

    public ProposalSetVerdict Validate(
        ProposalSetCandidate candidate,
        ConversationSnapshot snapshot,
        ProposalConstraints constraints,
        string conversationTimeZoneId)
    {
        if (snapshot.CurrentProposalSet is { IsOpen: true })
            return ProposalSetVerdict.Invalid("An open proposal set already exists.");

        if (candidate.Proposals.Count == 0)
            return ProposalSetVerdict.Invalid("The proposal set is empty.");

        if (candidate.Proposals.Count > constraints.MaxProposals)
            return ProposalSetVerdict.Invalid($"At most {constraints.MaxProposals} proposals per set.");

        var proposals = new List<TaskProposal>(candidate.Proposals.Count);
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        for (var index = 0; index < candidate.Proposals.Count; index++)
        {
            var item = candidate.Proposals[index];
            var at = $"proposals[{index}]";

            var title = item.Title.Trim();
            if (title.Length == 0)
                return ProposalSetVerdict.Invalid($"{at}: title is required.");
            if (title.Length > MaxTitleLength)
                return ProposalSetVerdict.Invalid($"{at}: title must be at most {MaxTitleLength} characters.");

            var duration = item.EndTime.ToTimeSpan() - item.StartTime.ToTimeSpan();
            if (duration <= TimeSpan.Zero)
                return ProposalSetVerdict.Invalid($"{at}: endTime must be after startTime on the same day.");
            if (duration < TimeSpan.FromMinutes(1) || duration > TimeSpan.FromMinutes(MaxDurationMinutes))
                return ProposalSetVerdict.Invalid(
                    $"{at}: the duration must be between 1 minute and {MaxDurationMinutes} minutes.");

            if (!seen.Add($"{title}|{item.Date:yyyy-MM-dd}|{item.StartTime:HH\\:mm}"))
                return ProposalSetVerdict.Invalid($"{at}: duplicate proposal (same title, date and start time).");

            proposals.Add(new TaskProposal(
                ProposalId: Guid.NewGuid(),
                Title: title,
                Description: string.IsNullOrWhiteSpace(item.Description) ? null : item.Description.Trim(),
                Date: item.Date,
                StartTime: item.StartTime,
                EndTime: item.EndTime,
                TimeZoneId: conversationTimeZoneId,
                LabelId: item.LabelId));
        }

        return new ProposalSetVerdict(proposals, null);
    }
}
