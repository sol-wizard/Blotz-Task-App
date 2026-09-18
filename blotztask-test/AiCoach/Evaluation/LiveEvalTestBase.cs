using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using FluentAssertions;
using Xunit.Abstractions;

namespace BlotzTask.Tests.AiCoach.Evaluation;

/// <summary>Live-model eval classes share one collection so they hit the deployment sequentially.</summary>
[CollectionDefinition(Name)]
public sealed class AiCoachLiveModelCollection
{
    public const string Name = "AiCoachLiveModel";
}

/// <summary>
/// Runs one real-model case (eval plan §7 / §11): every turn through the real pipeline against
/// the deployed model, hard checks + lightweight judge per turn, one JSON record per run.
/// AICOACH_EVAL_RUNS=3 repeats the case for the stability pass (§11.2); every run must pass.
/// Without credentials the case reports SKIPPED and does not count as passed (§17).
/// </summary>
public abstract class LiveEvalTestBase(ITestOutputHelper output)
{
    protected static int Runs =>
        int.TryParse(Environment.GetEnvironmentVariable("AICOACH_EVAL_RUNS"), out var n) && n > 0 ? n : 1;

    protected static IReadOnlySet<ConversationStrategy> Strategies(params ConversationStrategy[] strategies) =>
        strategies.ToHashSet();

    protected async Task RunLiveCaseAsync(AiCoachEvalCase evalCase, Func<AiCoachEvalHarness, Task>? seed = null)
    {
        var gateway = LiveModelGateway.TryCreate(out var deployment);
        if (gateway is null)
        {
            output.WriteLine("SKIPPED: no Azure OpenAI credentials (blotztask-api/appsettings.Development.json) or AICOACH_MODEL_TESTS=0.");
            return;
        }

        var judge = new LightweightJudge(gateway);
        var runs = Runs;
        var failedRuns = new List<string>();

        for (var run = 1; run <= runs; run++)
        {
            output.WriteLine($"=== {evalCase.Id} {evalCase.Title} — run {run}/{runs} on {deployment}");
            var harness = new AiCoachEvalHarness(evalCase.Mode, gateway);
            if (seed is not null)
            {
                await seed(harness);
                foreach (var seeded in harness.Turns)
                    output.WriteLine($"  [seed] U: {seeded.UserMessage}\n  [seed] A: {seeded.AssistantMessage} ({seeded.Outcome?.FinalStrategy})");
                harness.Gateway = gateway;
            }

            var checks = new List<EvalCheckResult>();
            var judgements = new Dictionary<int, JudgeRecord>();
            foreach (var turn in evalCase.Turns)
            {
                var result = await harness.RunTurnAsync(turn.UserMessage);
                var turnChecks = EvalChecks.Evaluate(evalCase.Id, turn, result, harness.Mode).ToList();
                PrintTurn(result, turnChecks);

                if (result.Outcome is { } outcome && result.ModelResult.CompletionReason == ModelTurnCompletionReason.Completed)
                {
                    var record = await JudgeTurnAsync(judge, harness, evalCase, turn, result, turnChecks);
                    judgements[result.TurnIndex] = record;
                }

                checks.AddRange(turnChecks);
            }

            var caseRecord = EvalRunRecorder.Build(
                evalCase.Id, evalCase.Title, evalCase.Mode, "live", run, harness, checks, judgements, deployment);
            EvalRunRecorder.Record(caseRecord);
            output.WriteLine($"--- run {run}: {caseRecord.Status}");

            if (caseRecord.Status == "FAIL")
                failedRuns.Add($"run {run}: {string.Join("; ", EvalChecks.HardFailures(checks))}");
        }

        var passed = runs - failedRuns.Count;
        var stability = runs >= 3
            ? passed == runs ? " → STABLE" : passed >= runs - 1 ? " → UNSTABLE" : " → FAILED"
            : string.Empty;
        output.WriteLine($"{evalCase.Id}: {passed}/{runs} runs passed{stability} (records: {EvalRunRecorder.RunFile})");

        failedRuns.Should().BeEmpty($"{evalCase.Id} ({evalCase.Title}) must pass every run");
    }

    private async Task<JudgeRecord> JudgeTurnAsync(
        LightweightJudge judge,
        AiCoachEvalHarness harness,
        AiCoachEvalCase evalCase,
        EvalTurn turn,
        EvalTurnResult result,
        List<EvalCheckResult> checks)
    {
        var outcome = result.Outcome!;
        var id = $"{evalCase.Id}.T{result.TurnIndex}";
        var transcript = harness.Transcript();
        QuestionJudgement? questionJudgement = null;
        ResponseJudgement? responseJudgement = null;

        if (!string.IsNullOrWhiteSpace(outcome.Question))
        {
            var (judgement, tokens) = await judge.JudgeQuestionAsync(evalCase.Mode, transcript, outcome.Question);
            questionJudgement = judgement;
            if (judgement is null)
            {
                output.WriteLine("  judge(question): unavailable (unparseable output)");
            }
            else
            {
                checks.Add(new EvalCheckResult($"{id}.JUDGE_QUESTION", "QUESTION_QUALITY", CheckSeverity.Soft, judgement.Passed,
                    "necessary/focused/informationGain/modeFit all >= 3",
                    $"{judgement.Necessary}/{judgement.Focused}/{judgement.InformationGain}/{judgement.ModeFit} {judgement.ReasonCode}: {judgement.Reason}"));
                output.WriteLine($"  judge(question): {(judgement.Passed ? "pass" : "WARN")} "
                                 + $"{judgement.Necessary}/{judgement.Focused}/{judgement.InformationGain}/{judgement.ModeFit} "
                                 + $"{judgement.ReasonCode} — {judgement.Reason} ({tokens} tokens)");
            }
        }

        if (turn.MustAddress.Count > 0 || turn.MustNotDo.Count > 0)
        {
            var (judgement, tokens) = await judge.JudgeResponseAsync(
                evalCase.Mode, transcript, outcome.AssistantMessage, turn.MustAddress, turn.MustNotDo);
            responseJudgement = judgement;
            if (judgement is null)
            {
                output.WriteLine("  judge(response): unavailable (unparseable output)");
            }
            else
            {
                checks.Add(new EvalCheckResult($"{id}.JUDGE_RESPONSE", "RESPONSE_QUALITY", CheckSeverity.Soft, judgement.Passed,
                    "PASS", $"{judgement.Label}: {judgement.Reason}"));
                output.WriteLine($"  judge(response): {judgement.Label} — {judgement.Reason} ({tokens} tokens)");
            }
        }

        return new JudgeRecord(questionJudgement, responseJudgement);
    }

    private void PrintTurn(EvalTurnResult result, IReadOnlyList<EvalCheckResult> checks)
    {
        var outcome = result.Outcome;
        output.WriteLine($"  U: {result.UserMessage}");
        if (outcome is null)
        {
            output.WriteLine($"  A: <no outcome> completion={result.ModelResult.CompletionReason}");
        }
        else
        {
            output.WriteLine($"  A: {outcome.AssistantMessage}");
            output.WriteLine($"     strategy={outcome.FinalStrategy} ({outcome.DecisionType}/{outcome.ReasonCode}) "
                             + $"fallback={outcome.FallbackUsed} question={(outcome.Question is null ? "-" : $"\"{outcome.Question}\" [{outcome.QuestionTopic}]")}");
            if (outcome.AcceptedProposals is { Count: > 0 } proposals)
                output.WriteLine($"     proposals: {EvalChecks.Describe(proposals)}");
        }

        output.WriteLine($"     state after: phase={result.StateAfter.Phase} pendingSet={result.StateAfter.CurrentProposalSet is { IsOpen: true }} "
                         + $"openQuestion={result.StateAfter.OpenQuestion is not null} preference={result.StateAfter.CompanionContext?.ExplicitPreference?.Kind.ToString() ?? "-"}");
        output.WriteLine($"     model calls={result.ModelResult.ModelCallCount} tokens={result.ModelResult.TotalTokens} "
                         + $"schemaCorrections={result.ModelResult.SchemaCorrectionCount} regenerations={result.ModelResult.RegenerationCount} "
                         + $"proposalRegenerations={result.ModelResult.ProposalRegenerationCount}");

        foreach (var check in checks.Where(c => !c.Passed))
            output.WriteLine($"     {check}");

        if (EvalChecks.HardFailures(checks).Any())
        {
            for (var i = 0; i < result.ModelCalls.Count; i++)
                output.WriteLine($"     raw model output #{i + 1}: {result.ModelCalls[i].RawOutput}");
        }
    }
}
