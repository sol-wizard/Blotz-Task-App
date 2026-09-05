using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;

namespace BlotzTask.Modules.AiCoach.Domain.Proposals;

public sealed record ProposalGenerationContext(
    ConversationSnapshot Snapshot,
    VerifiedPlanningContext VerifiedPlanning,
    PlanningDecision PlanningDecision,
    ProposalGenerationPolicy Policy,
    DateTimeOffset UserLocalNow,
    string TimeZoneId,
    int MaxProposals);

public sealed record ProposalGenerationResult(
    ProposalSetCandidate? Candidate,
    string AssistantMessage,
    IReadOnlyList<AllowedAssumption> AppliedAssumptions,
    IReadOnlyList<ProposalGenerationWarning> Warnings);

public enum ProposalGenerationWarning
{
    NoPlanningItems = 0,
    MovedToNextWorkingDay = 1,
    ProposalLimitApplied = 2,
    PlanningNotReady = 3,
}

public interface IDeterministicProposalGenerator
{
    ProposalGenerationResult Generate(ProposalGenerationContext context);
}

/// <summary>
/// Generates a reversible draft only after Policy has allowed GenerateProposal. This service
/// owns scheduling defaults; it never decides whether the user authorized the proposal path.
/// </summary>
public sealed class DeterministicProposalGenerator : IDeterministicProposalGenerator
{
    public ProposalGenerationResult Generate(ProposalGenerationContext context)
    {
        if (!context.PlanningDecision.Allows(AllowedPlanningAction.GenerateProposal))
        {
            return new ProposalGenerationResult(
                null,
                "Planning information is not sufficient to generate a draft.",
                [],
                [ProposalGenerationWarning.PlanningNotReady]);
        }

        var warnings = new List<ProposalGenerationWarning>();
        var sourceItems = CurrentItems(context);
        if (sourceItems.Count == 0)
        {
            return new ProposalGenerationResult(
                null,
                "A concrete planning item is still required.",
                [],
                [ProposalGenerationWarning.NoPlanningItems]);
        }

        if (sourceItems.Count > context.MaxProposals)
            warnings.Add(ProposalGenerationWarning.ProposalLimitApplied);

        var policy = context.Policy;
        var requestedStart = context.UserLocalNow.DateTime.AddMinutes(policy.MinimumLeadMinutes);
        var start = ProposalScheduleRules.NextAllowedStart(
            requestedStart, context.UserLocalNow, policy, policy.DefaultDurationMinutes);
        if (start.Date > requestedStart.Date)
            warnings.Add(ProposalGenerationWarning.MovedToNextWorkingDay);

        var proposals = new List<TaskProposalCandidate>();
        var index = 0;
        foreach (var item in sourceItems.Take(context.MaxProposals))
        {
            index++;
            var nextStart = ProposalScheduleRules.NextAllowedStart(
                start, context.UserLocalNow, policy, policy.DefaultDurationMinutes);
            if (nextStart.Date > start.Date)
                warnings.Add(ProposalGenerationWarning.MovedToNextWorkingDay);
            start = nextStart;
            var end = start.AddMinutes(policy.DefaultDurationMinutes);

            var chinese = ContainsCjk(item.Text);
            proposals.Add(new TaskProposalCandidate(
                $"default-{index}",
                BuildTitle(item),
                chinese
                    ? "这是可编辑的保守默认安排。"
                    : "This is an editable conservative default.",
                DateOnly.FromDateTime(start),
                TimeOnly.FromDateTime(start),
                TimeOnly.FromDateTime(end),
                LabelId: null));
            start = end;
        }

        var useChinese = sourceItems.Any(item => ContainsCjk(item.Text));
        return new ProposalGenerationResult(
            new ProposalSetCandidate(proposals),
            useChinese
                ? $"我先按每项 {policy.DefaultDurationMinutes} 分钟生成了一个可编辑的安排，请确认或调整。"
                : $"I made an editable {policy.DefaultDurationMinutes}-minute draft for each item. Confirm or adjust it.",
            context.PlanningDecision.AllowedAssumptions,
            warnings.Distinct().ToList());
    }

    private static IReadOnlyList<PlanningItemSource> CurrentItems(ProposalGenerationContext context)
    {
        var verified = context.VerifiedPlanning.Items
            .Select(item => new PlanningItemSource(item.Text, item.Kind));
        var activeIntent = context.Snapshot.ActivePlanningIntent is
            { Status: PlanningIntentStatus.Collecting or PlanningIntentStatus.ReadyForProposal } reusable
            ? reusable
            : null;
        var persisted = (activeIntent?.Items ?? [])
            .Select(item => new PlanningItemSource(item.Text, item.Kind));

        return persisted.Concat(verified)
            .GroupBy(item => item.Text, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.Last())
            .ToList();
    }

    private static string BuildTitle(PlanningItemSource item) => item.Kind switch
    {
        PlanningItemKind.Action => item.Text,
        _ when ContainsCjk(item.Text) => $"开始探索：{item.Text}",
        _ => $"Explore: {item.Text}",
    };

    private static bool ContainsCjk(string text) =>
        text.Any(character => character is >= '\u3400' and <= '\u9fff');

    private sealed record PlanningItemSource(string Text, PlanningItemKind Kind);
}
