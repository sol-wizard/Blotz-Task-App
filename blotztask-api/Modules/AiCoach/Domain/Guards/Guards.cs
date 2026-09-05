using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Domain.Guards;

/// <summary>
/// Evidence Guard (v3 tech design §14.1). Planning claims must carry literal quotes from the
/// current user message. It validates provenance only; readiness and strategy remain owned by
/// their dedicated policy layers.
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

        return new VerifiedPlanningContext(
            verifiedItems,
            verifiedConstraints,
            disposition,
            new EvidenceSummary(
                submittedClaims,
                verifiedItems.Count + verifiedConstraints.Count + verifiedDispositionClaims,
                issues));
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
        string conversationTimeZoneId,
        DateTimeOffset userLocalNow,
        ProposalGenerationPolicy generationPolicy);
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
        string conversationTimeZoneId,
        DateTimeOffset userLocalNow,
        ProposalGenerationPolicy generationPolicy)
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

            var scheduleError = ProposalScheduleRules.Validate(item, userLocalNow, generationPolicy);
            if (scheduleError is not null)
                return ProposalSetVerdict.Invalid($"{at}: {scheduleError}");

            var duration = item.EndTime.ToTimeSpan() - item.StartTime.ToTimeSpan();
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
