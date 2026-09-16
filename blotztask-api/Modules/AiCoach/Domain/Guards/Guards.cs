using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Domain.Guards;

/// <summary>
/// Evidence Guard (v3 tech design §14.1). Claims and quotes must remain non-empty. Literal
/// source matching is temporarily disabled; readiness and strategy remain owned by their
/// dedicated policy layers.
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

            // Source validation is intentionally disabled for now. Keep this check close to the
            // acceptance point so it can be restored if production evidence shows it is needed.
            // if (!ContainsQuote(currentUserMessage, item.Evidence.Quote))
            // {
            //     issues.Add(EvidenceIssue.QuoteNotFound);
            //     continue;
            // }

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

            // Source validation is intentionally disabled for now.
            // if (!ContainsQuote(currentUserMessage, constraint.Evidence.Quote))
            // {
            //     issues.Add(EvidenceIssue.QuoteNotFound);
            //     continue;
            // }

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
            else
            {
                // Source validation is intentionally disabled for now.
                // if (!ContainsQuote(currentUserMessage, candidateDisposition.Evidence.Quote))
                // {
                //     issues.Add(EvidenceIssue.QuoteNotFound);
                // }
                // else
                // {
                disposition = candidateDisposition.Kind;
                verifiedDispositionClaims++;
                // }
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

        verifiedClaims++;
        return new VerifiedSupportRequest(candidate.Kind, quote, candidate.Scope);
    }

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

        // Source validation is intentionally disabled for now.
        // if (!ContainsQuote(currentUserMessage, quote))
        // {
        //     issues.Add(EvidenceIssue.QuoteNotFound);
        //     return false;
        // }

        return true;
    }

    private static bool ContainsQuote(string message, string quote) =>
        Normalize(message).Contains(Normalize(quote), StringComparison.OrdinalIgnoreCase);

    private static string Normalize(string text) =>
        string.Concat(text.Where(c => !char.IsWhiteSpace(c)));
}

/// <summary>
/// Response Guard (v3 tech design §14.2). It validates deterministic response structure:
/// non-empty text and the length budget. It does not attempt to understand free text.
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
            return ProposalSetVerdict.Invalid("A proposal set is already open.");

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
