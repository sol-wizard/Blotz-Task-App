using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Domain.Guards;

/// <summary>
/// Evidence Guard (v3 tech design §14.1). v1 scope: the action-intent evidence must be a
/// literal quote from the CURRENT user message — that is the only evidence v1 policy consumes
/// (HasExplicitActionIntentInCurrentTurn is turn-scoped by definition). Model inference can
/// never substitute for it.
/// </summary>
public interface IEvidenceGuard
{
    EvidenceVerdict Verify(InterpretationSignals signals, string currentUserMessage);
}

public sealed record EvidenceVerdict(bool ActionIntentVerified, string? Detail);

public sealed class EvidenceGuard : IEvidenceGuard
{
    public EvidenceVerdict Verify(InterpretationSignals signals, string currentUserMessage)
    {
        if (!signals.UserExpressedActionIntent)
            return new EvidenceVerdict(false, null);

        if (string.IsNullOrWhiteSpace(signals.ActionIntentQuote))
            return new EvidenceVerdict(false, "Action intent was claimed without an evidence quote.");

        return Normalize(currentUserMessage).Contains(Normalize(signals.ActionIntentQuote), StringComparison.OrdinalIgnoreCase)
            ? new EvidenceVerdict(true, null)
            : new EvidenceVerdict(false, "The evidence quote does not appear in the current user message.");
    }

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
