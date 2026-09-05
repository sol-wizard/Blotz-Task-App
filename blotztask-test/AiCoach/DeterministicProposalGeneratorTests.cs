using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

public class DeterministicProposalGeneratorTests
{
    [Fact]
    public void Generate_AppliesVersionedDurationAndSlotPolicy()
    {
        var mode = ExecutionModeDefinition.Create();
        var verified = new VerifiedPlanningContext(
            [new VerifiedPlanningItem("整理资料", PlanningItemKind.Action, "整理资料")],
            [], UserTurnDisposition.NotApplicable, new EvidenceSummary(1, 1, []));
        var decision = new PlanningReadinessCalculator().Calculate(new PlanningReadinessContext(
            Snapshot(mode), verified, mode.Policy.Planning));

        var result = new DeterministicProposalGenerator().Generate(new ProposalGenerationContext(
            Snapshot(mode), verified, decision, mode.Policy.ProposalGeneration,
            new DateTimeOffset(2026, 9, 3, 9, 2, 0, TimeSpan.FromHours(10)),
            "Australia/Sydney", 3));

        result.Candidate!.Proposals.Should().ContainSingle();
        result.Candidate.Proposals[0].StartTime.Should().Be(new TimeOnly(9, 30));
        result.Candidate.Proposals[0].EndTime.Should().Be(new TimeOnly(10, 0));
        result.AppliedAssumptions.Should().Contain(AllowedAssumption.DefaultDuration);
    }

    [Fact]
    public void Generate_AfterWorkingHours_MovesToNextWorkingDay()
    {
        var mode = ExecutionModeDefinition.Create();
        var verified = new VerifiedPlanningContext(
            [new VerifiedPlanningItem("整理资料", PlanningItemKind.Action, "整理资料")],
            [], UserTurnDisposition.NotApplicable, new EvidenceSummary(1, 1, []));
        var snapshot = Snapshot(mode);
        var decision = new PlanningReadinessCalculator().Calculate(new PlanningReadinessContext(
            snapshot, verified, mode.Policy.Planning));

        var result = new DeterministicProposalGenerator().Generate(new ProposalGenerationContext(
            snapshot, verified, decision, mode.Policy.ProposalGeneration,
            new DateTimeOffset(2026, 9, 3, 20, 50, 0, TimeSpan.FromHours(10)),
            "Australia/Sydney", 3));

        result.Candidate!.Proposals[0].Date.Should().Be(new DateOnly(2026, 9, 4));
        result.Candidate.Proposals[0].StartTime.Should().Be(new TimeOnly(8, 0));
        result.Warnings.Should().Contain(ProposalGenerationWarning.MovedToNextWorkingDay);
    }

    [Fact]
    public void Generate_WhenSameDayIsDisallowed_UsesNextWorkingDayAndPassesSharedRules()
    {
        var mode = ExecutionModeDefinition.Create();
        var policy = mode.Policy.ProposalGeneration with { AllowSameDay = false };
        var verified = new VerifiedPlanningContext(
            [new VerifiedPlanningItem("整理资料", PlanningItemKind.Action, "整理资料")],
            [], UserTurnDisposition.NotApplicable, new EvidenceSummary(1, 1, []));
        var snapshot = Snapshot(mode);
        var decision = new PlanningReadinessCalculator().Calculate(new PlanningReadinessContext(
            snapshot, verified, mode.Policy.Planning));
        var localNow = new DateTimeOffset(2026, 9, 3, 9, 0, 0, TimeSpan.FromHours(10));

        var result = new DeterministicProposalGenerator().Generate(new ProposalGenerationContext(
            snapshot, verified, decision, policy, localNow, "Australia/Sydney", 3));

        var candidate = result.Candidate!.Proposals.Single();
        candidate.Date.Should().Be(new DateOnly(2026, 9, 4));
        ProposalScheduleRules.Validate(candidate, localNow, policy).Should().BeNull(
            "the deterministic generator and proposal guard share the same scheduling rules");
    }

    private static ConversationSnapshot Snapshot(AiCoachModeDefinition mode) => new(
        Guid.NewGuid(), Guid.NewGuid(), mode.Mode, ConversationPhase.Conversing,
        GenerationStatus.Running, BlockedReason.None, 1,
        null, null, new HashSet<ConversationFact>(), new HashSet<ConversationAction>(),
        mode.ToRuntimeVersions(2));
}
