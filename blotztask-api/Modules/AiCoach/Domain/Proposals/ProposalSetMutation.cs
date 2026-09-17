using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Guards;

namespace BlotzTask.Modules.AiCoach.Domain.Proposals;

public static class ProposalReferenceKeys
{
    public const string CurrentArtifact = "current_card";

    public static string ForIndex(int zeroBasedIndex) => $"item_{zeroBasedIndex + 1}";
}

public enum ProposalSetMutationReadiness
{
    ReadyToApply = 0,
    NeedsClarification = 1,
    Invalid = 2,
}

public enum ProposalSetMutationReason
{
    None = 0,
    ArtifactNotMutable = 1,
    ArtifactReferenceInvalid = 2,
    AmbiguousRequest = 3,
    MissingOperations = 4,
    EvidenceInvalid = 5,
    TargetReferenceInvalid = 6,
    DuplicateOperationKey = 7,
    TargetConflict = 8,
    PatchInvalid = 9,
    ItemInvalid = 10,
    ItemLimitExceeded = 11,
    PersistedItemImmutable = 12,
}

public sealed record ProposalSetMutationSummary(
    int AddedCount,
    int UpdatedCount,
    int RemovedCount,
    IReadOnlyList<string> AddedTitles,
    IReadOnlyList<string> UpdatedTitles,
    IReadOnlyList<string> RemovedTitles,
    bool SetDiscarded,
    int ResultingItemCount);

public sealed record ProposalSetMutationVerdict(
    ProposalSetMutationReadiness Readiness,
    ProposalSetMutationReason Reason,
    Guid? ProposalSetId,
    int? BaseProposalSetVersion,
    IReadOnlyList<TaskProposal>? Proposals,
    ProposalSetMutationSummary? Summary,
    string? Detail)
{
    public bool IsReady => Readiness == ProposalSetMutationReadiness.ReadyToApply;
    public bool DiscardsSet => IsReady && Summary?.SetDiscarded == true;

    public static ProposalSetMutationVerdict Clarification(string detail) => new(
        ProposalSetMutationReadiness.NeedsClarification,
        ProposalSetMutationReason.AmbiguousRequest,
        null, null, null, null, detail);

    public static ProposalSetMutationVerdict Invalid(
        ProposalSetMutationReason reason,
        string detail) => new(
        ProposalSetMutationReadiness.Invalid,
        reason,
        null, null, null, null, detail);
}

public interface IProposalSetMutationHandler
{
    ProposalSetMutationVerdict Evaluate(
        ProposalSetSnapshot? currentSet,
        ProposalSetMutationCandidate candidate,
        string currentUserMessage,
        int maxProposals);
}

/// <summary>
/// Pure, atomic evaluator for pending-card mutations. Every reference resolves against the
/// pre-mutation snapshot; a single invalid operation rejects the whole candidate.
/// </summary>
public sealed class ProposalSetMutationHandler : IProposalSetMutationHandler
{
    public const int MaxOperationsPerTurn = 20;

    public ProposalSetMutationVerdict Evaluate(
        ProposalSetSnapshot? currentSet,
        ProposalSetMutationCandidate candidate,
        string currentUserMessage,
        int maxProposals)
    {
        if (currentSet is null || currentSet.Status != ProposalSetStatus.Pending)
            return ProposalSetMutationVerdict.Invalid(
                ProposalSetMutationReason.ArtifactNotMutable,
                "Only the current pending proposal set can be changed by the model.");

        if (!string.Equals(candidate.ArtifactReferenceKey, ProposalReferenceKeys.CurrentArtifact,
                StringComparison.Ordinal))
            return ProposalSetMutationVerdict.Invalid(
                ProposalSetMutationReason.ArtifactReferenceInvalid,
                "The mutation does not target the current card reference.");

        if (candidate.Ambiguities.Count > 0)
        {
            var validReferences = Enumerable.Range(0, currentSet.Proposals.Count)
                .Select(ProposalReferenceKeys.ForIndex)
                .ToHashSet(StringComparer.Ordinal);
            foreach (var ambiguity in candidate.Ambiguities)
            {
                if (!QuoteExists(currentUserMessage, ambiguity.Evidence.Quote))
                    return ProposalSetMutationVerdict.Invalid(
                        ProposalSetMutationReason.EvidenceInvalid,
                        "The reported mutation ambiguity is not supported by the current user message.");
                if (ambiguity.CandidateReferenceKeys.Any(reference => !validReferences.Contains(reference)))
                    return ProposalSetMutationVerdict.Invalid(
                        ProposalSetMutationReason.TargetReferenceInvalid,
                        "The reported mutation ambiguity contains an unknown item reference.");
            }

            return ProposalSetMutationVerdict.Clarification(
                $"The requested card change has {candidate.Ambiguities.Count} unresolved ambiguity item(s).");
        }

        if (candidate.Operations.Count == 0)
            return ProposalSetMutationVerdict.Invalid(
                ProposalSetMutationReason.MissingOperations,
                "The card mutation has no operations.");

        if (candidate.Operations.Count > MaxOperationsPerTurn)
            return ProposalSetMutationVerdict.Invalid(
                ProposalSetMutationReason.ItemLimitExceeded,
                $"At most {MaxOperationsPerTurn} card operations are allowed in one turn.");

        var duplicateOperationKey = candidate.Operations
            .GroupBy(operation => operation.OperationKey, StringComparer.Ordinal)
            .FirstOrDefault(group => string.IsNullOrWhiteSpace(group.Key) || group.Count() > 1);
        if (duplicateOperationKey is not null)
            return ProposalSetMutationVerdict.Invalid(
                ProposalSetMutationReason.DuplicateOperationKey,
                "Mutation operation keys must be non-empty and unique.");

        foreach (var operation in candidate.Operations)
        {
            if (!QuoteExists(currentUserMessage, operation.Evidence.Quote))
                return ProposalSetMutationVerdict.Invalid(
                    ProposalSetMutationReason.EvidenceInvalid,
                    $"Operation '{operation.OperationKey}' is not supported by a quote from the current user message.");
        }

        var references = currentSet.Proposals
            .Select((proposal, index) => new { Key = ProposalReferenceKeys.ForIndex(index), Proposal = proposal })
            .ToDictionary(item => item.Key, item => item.Proposal, StringComparer.Ordinal);

        var targeted = new HashSet<Guid>();
        foreach (var operation in candidate.Operations)
        {
            if (operation is not (UpdateProposalItemCandidate or RemoveProposalItemCandidate))
                continue;

            var targetReference = operation switch
            {
                UpdateProposalItemCandidate update => update.TargetReferenceKey,
                RemoveProposalItemCandidate remove => remove.TargetReferenceKey,
                _ => throw new InvalidOperationException("Unexpected target operation."),
            };

            if (!references.TryGetValue(targetReference, out var target))
                return ProposalSetMutationVerdict.Invalid(
                    ProposalSetMutationReason.TargetReferenceInvalid,
                    $"Unknown proposal reference '{targetReference}'.");
            if (target.PersistedTaskId.HasValue)
                return ProposalSetMutationVerdict.Invalid(
                    ProposalSetMutationReason.PersistedItemImmutable,
                    $"Proposal reference '{targetReference}' is already a formal task.");
            if (!targeted.Add(target.ProposalId))
                return ProposalSetMutationVerdict.Invalid(
                    ProposalSetMutationReason.TargetConflict,
                    $"Proposal reference '{targetReference}' is changed more than once in one mutation.");
        }

        var removedIds = candidate.Operations
            .OfType<RemoveProposalItemCandidate>()
            .Select(operation => references[operation.TargetReferenceKey].ProposalId)
            .ToHashSet();
        var updates = candidate.Operations
            .OfType<UpdateProposalItemCandidate>()
            .ToDictionary(operation => references[operation.TargetReferenceKey].ProposalId);

        var resulting = new List<TaskProposal>();
        var updatedTitles = new List<string>();
        var removedTitles = currentSet.Proposals
            .Where(proposal => removedIds.Contains(proposal.ProposalId))
            .Select(proposal => proposal.Title)
            .ToList();

        foreach (var existing in currentSet.Proposals)
        {
            if (removedIds.Contains(existing.ProposalId))
                continue;

            if (updates.TryGetValue(existing.ProposalId, out var update))
            {
                var patched = ApplyPatch(existing, update.Patch, out var patchError);
                if (patchError is not null)
                    return ProposalSetMutationVerdict.Invalid(
                        ProposalSetMutationReason.PatchInvalid,
                        $"Operation '{update.OperationKey}': {patchError}");
                resulting.Add(patched!);
                updatedTitles.Add(patched!.Title);
            }
            else
            {
                resulting.Add(existing);
            }
        }

        var addedTitles = new List<string>();
        foreach (var add in candidate.Operations.OfType<AddProposalItemCandidate>())
        {
            var item = add.Item;
            var proposal = new TaskProposal(
                Guid.NewGuid(),
                item.Title.Trim(),
                string.IsNullOrWhiteSpace(item.Description) ? null : item.Description.Trim(),
                item.Date,
                item.StartTime,
                item.EndTime,
                currentSet.Proposals.FirstOrDefault()?.TimeZoneId ?? "UTC",
                item.LabelId);
            resulting.Add(proposal);
            addedTitles.Add(proposal.Title);
        }

        if (resulting.Count > maxProposals)
            return ProposalSetMutationVerdict.Invalid(
                ProposalSetMutationReason.ItemLimitExceeded,
                $"The resulting card would contain {resulting.Count} items; the limit is {maxProposals}.");

        var validationError = ValidateCompleteSet(resulting);
        if (validationError is not null)
            return ProposalSetMutationVerdict.Invalid(ProposalSetMutationReason.ItemInvalid, validationError);

        var summary = new ProposalSetMutationSummary(
            addedTitles.Count,
            updatedTitles.Count,
            removedTitles.Count,
            addedTitles,
            updatedTitles,
            removedTitles,
            SetDiscarded: resulting.Count == 0,
            ResultingItemCount: resulting.Count);

        return new ProposalSetMutationVerdict(
            ProposalSetMutationReadiness.ReadyToApply,
            ProposalSetMutationReason.None,
            currentSet.Id,
            currentSet.Version,
            resulting,
            summary,
            null);
    }

    private static TaskProposal? ApplyPatch(
        TaskProposal existing,
        ProposalItemPatchCandidate patch,
        out string? error)
    {
        error = null;
        if (patch.ChangedFields.Count == 0)
        {
            error = "At least one changed field is required.";
            return null;
        }

        if (patch.ChangedFields.Contains(ProposalField.Title) && string.IsNullOrWhiteSpace(patch.Title))
        {
            error = "Title cannot be cleared.";
            return null;
        }
        if (patch.ChangedFields.Contains(ProposalField.Date) && patch.Date is null
            || patch.ChangedFields.Contains(ProposalField.StartTime) && patch.StartTime is null
            || patch.ChangedFields.Contains(ProposalField.EndTime) && patch.EndTime is null)
        {
            error = "Date and time fields cannot be cleared.";
            return null;
        }

        return existing with
        {
            Title = patch.ChangedFields.Contains(ProposalField.Title) ? patch.Title!.Trim() : existing.Title,
            Description = patch.ChangedFields.Contains(ProposalField.Description)
                ? string.IsNullOrWhiteSpace(patch.Description) ? null : patch.Description.Trim()
                : existing.Description,
            Date = patch.ChangedFields.Contains(ProposalField.Date) ? patch.Date!.Value : existing.Date,
            StartTime = patch.ChangedFields.Contains(ProposalField.StartTime)
                ? patch.StartTime!.Value : existing.StartTime,
            EndTime = patch.ChangedFields.Contains(ProposalField.EndTime) ? patch.EndTime!.Value : existing.EndTime,
            LabelId = patch.ChangedFields.Contains(ProposalField.LabelId) ? patch.LabelId : existing.LabelId,
        };
    }

    private static string? ValidateCompleteSet(IReadOnlyList<TaskProposal> proposals)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        for (var index = 0; index < proposals.Count; index++)
        {
            var proposal = proposals[index];
            var at = $"proposals[{index}]";
            if (string.IsNullOrWhiteSpace(proposal.Title))
                return $"{at}: title is required.";
            if (proposal.Title.Length > ProposalSetGuard.MaxTitleLength)
                return $"{at}: title must be at most {ProposalSetGuard.MaxTitleLength} characters.";

            var duration = proposal.EndTime.ToTimeSpan() - proposal.StartTime.ToTimeSpan();
            if (duration < TimeSpan.FromMinutes(1)
                || duration > TimeSpan.FromMinutes(ProposalSetGuard.MaxDurationMinutes))
                return $"{at}: the duration must be between 1 and {ProposalSetGuard.MaxDurationMinutes} minutes.";

            if (!seen.Add($"{proposal.Title}|{proposal.Date:yyyy-MM-dd}|{proposal.StartTime:HH\\:mm}"))
                return $"{at}: duplicate proposal (same title, date and start time).";
        }

        return null;
    }

    private static bool QuoteExists(string message, string quote)
    {
        if (string.IsNullOrWhiteSpace(quote))
            return false;
        return Normalize(message).Contains(Normalize(quote), StringComparison.OrdinalIgnoreCase);
    }

    private static string Normalize(string value) =>
        string.Concat(value.Where(character => !char.IsWhiteSpace(character)));
}

/// <summary>
/// Deterministic success copy derived from the accepted mutation, never from a model claim.
/// This keeps the visible acknowledgement aligned with the card committed by the Kernel.
/// </summary>
public static class ProposalSetMutationResponseProjector
{
    public static string Render(ProposalSetMutationSummary summary, string currentUserMessage)
    {
        var chinese = currentUserMessage.Any(character => character is >= '\u3400' and <= '\u9fff');
        if (summary.SetDiscarded)
        {
            return chinese
                ? "已移除这张草案卡片；没有创建、修改或删除任何正式任务。"
                : "I removed this draft card. No formal tasks were created, changed, or deleted.";
        }

        return chinese
            ? $"已更新卡片：新增 {summary.AddedCount} 条、修改 {summary.UpdatedCount} 条、删除 {summary.RemovedCount} 条；现在共有 {summary.ResultingItemCount} 条待确认任务。"
            : $"I updated the card: added {summary.AddedCount}, changed {summary.UpdatedCount}, and removed {summary.RemovedCount}. It now has {summary.ResultingItemCount} task(s) awaiting confirmation.";
    }
}
