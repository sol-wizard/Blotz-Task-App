using System.Diagnostics;
using System.Text.Json;
using Azure;
using Azure.AI.OpenAI;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Prompts;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Ai.Tools;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit.Abstractions;

namespace BlotzTask.Tests.AiCoach.Evaluation;

/// <summary>
/// Opt-in conversation-quality suite driven by conversation-quality-scenarios.json. Runs the real model through
/// ModelTurnRuntime (no database), so each scenario can set its own clock and user memory. Tone checks are only
/// reported as rates; business checks must hold on every run. See docs/ai-coach-conversation-quality.md.
/// </summary>
public sealed class CoachConversationQualityTests(ITestOutputHelper output)
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    [CoachLiveFact]
    public async Task Handle_ConversationQualitySuite_RecordsRatesAndKeepsBusinessRules()
    {
        // Arrange
        var root = CoachEvaluationHarness.FindRepository();
        var suite = JsonSerializer.Deserialize<QualitySuite>(File.ReadAllText(
            Path.Combine(root, "blotztask-test", "AiCoach", "Evaluation", "conversation-quality-scenarios.json")), Web)
            ?? throw new InvalidOperationException("Cannot read conversation-quality-scenarios.json.");
        var only = Environment.GetEnvironmentVariable("AICOACH_QUALITY_ONLY")?.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        var runsOverride = Environment.GetEnvironmentVariable("AICOACH_QUALITY_RUNS") is { } raw
            ? int.TryParse(raw, out var parsed) && parsed is >= 1 and <= 10 ? parsed
                : throw new InvalidOperationException("AICOACH_QUALITY_RUNS must be between 1 and 10.")
            : (int?)null;
        var credentials = CoachLiveSettings.Load() ?? throw new InvalidOperationException("Live credentials missing.");
        var deployment = Environment.GetEnvironmentVariable("AICOACH_EVAL_MODEL") ?? credentials.Deployment;
        var transport = Environment.GetEnvironmentVariable("AICOACH_EVAL_TRANSPORT") ?? "chat";
        var judgeDeployment = Environment.GetEnvironmentVariable("AICOACH_EVAL_JUDGE_MODEL") ?? credentials.Deployment;
        var limits = new AiCoachModuleOptions { DeploymentId = deployment };
        var options = Options.Create(limits);
        var client = new AzureOpenAIClient(new Uri(credentials.Endpoint), new AzureKeyCredential(credentials.Key));
        IModelGateway gateway = transport switch
        {
            "chat" => new AzureOpenAiModelGateway(client, options),
            "responses" => new ResponsesEvaluationGateway(credentials.Endpoint, credentials.Key, deployment),
            _ => throw new InvalidOperationException("AICOACH_EVAL_TRANSPORT must be chat or responses."),
        };
        var runtime = new ModelTurnRuntime(gateway, options, NullLogger<ModelTurnRuntime>.Instance,
            new ModelContextBuilder(options, NullLogger<ModelContextBuilder>.Instance));
        var judge = new CoachSemanticJudge(new AzureOpenAiModelGateway(client,
            Options.Create(new AiCoachModuleOptions { DeploymentId = judgeDeployment })));
        var directory = Path.Combine(root, "blotztask-test", "TestResults", "ai-coach-evals",
            $"quality-{DateTime.UtcNow:yyyyMMddTHHmmss}-{Guid.NewGuid():N}");
        Directory.CreateDirectory(directory);
        var header = new
        {
            commit = CoachEvaluationHarness.Git(root, "rev-parse", "HEAD"),
            sourceFingerprint = CoachEvaluationHarness.SourceFingerprint(root),
            promptVersion = CoachPrompt.ReviewListPromptVersion, toolContractVersion = ToolExecutor.ContractVersion,
            deployment, transport, judgeDeployment, judgeVersion = CoachSemanticJudge.Version,
        };
        var businessFailures = new List<string>();

        // Act
        foreach (var scenario in suite.Scenarios.Where(item => only is null || only.Contains(item.Id)))
        for (var run = 1; run <= (runsOverride ?? scenario.Runs); run++)
        {
            var (turns, evidence) = await RunConversationAsync(runtime, suite, scenario);
            using var judgeTimeout = new CancellationTokenSource(TimeSpan.FromSeconds(60));
            var aiEvaluation = await judge.EvaluateAsync(scenario.Id, scenario.Criteria, evidence,
                judgeTimeout.Token, scenario.LocalTime);
            businessFailures.AddRange(turns.SelectMany(turn => turn.BusinessFailures
                .Select(check => $"{scenario.Id} run {run} turn {turn.Turn}: {check}")));
            await File.WriteAllTextAsync(Path.Combine(directory, $"{scenario.Id}-{run}.json"), JsonSerializer.Serialize(new
            {
                schemaVersion = 1, suite = "conversation-quality", scenario.Id, scenario.Category, scenario.Source, run,
                recordedAt = DateTimeOffset.UtcNow, header, scenario.LocalTime, scenario.Criteria, turns, aiEvaluation,
            }, new JsonSerializerOptions(Web) { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping }));
        }
        output.WriteLine($"Conversation-quality results: {directory}");

        // Assert
        businessFailures.Should().BeEmpty(
            because: "business rules must hold on every run; tone checks are reported as rates in the run directory");
    }

    private static async Task<(List<QualityTurnResult> Turns, List<JudgeTurnEvidence> Evidence)> RunConversationAsync(
        ModelTurnRuntime runtime, QualitySuite suite, QualityScenario scenario)
    {
        var conversationId = Guid.NewGuid();
        var history = new List<GatewayMessage>();
        IReadOnlyList<ProposalSet> drafts = [];
        var turns = new List<QualityTurnResult>();
        var evidence = new List<JudgeTurnEvidence>();
        for (var index = 0; index < scenario.Turns.Length; index++)
        {
            var turn = scenario.Turns[index];
            var before = drafts;
            history.Add(new GatewayUserMessage(turn.User));
            // list_tasks always sees an empty schedule, so scenarios never depend on real task data.
            var request = new ModelTurnRequest(conversationId, history.ToList(), drafts, suite.TimeZone, scenario.LocalTime,
                null, 0, ReadTasks: (_, _, _) => Task.FromResult("No tasks scheduled in this range."),
                ReviewListEnabled: true, UserContext: scenario.UserContext);
            var watch = Stopwatch.StartNew();
            var result = await runtime.ExecuteAsync(request, default);
            history.AddRange(result.TurnHistory);
            drafts = result.Drafts;
            var outcome = new TurnOutcome(turn.User, result.Text ?? "", result.FollowUps ?? [], before, drafts, scenario.LocalTime);
            var tone = turn.Tone.ToDictionary(check => check, check => Check(check, outcome, suite.Keywords));
            var business = turn.Business.ToDictionary(check => check, check => Check(check, outcome, suite.Keywords));
            var businessFailures = business.Where(pair => !pair.Value).Select(pair => pair.Key).ToList();
            if (result.Error is not null) businessFailures.Add($"modelError:{result.Error}");
            turns.Add(new(index + 1, turn.User, result.Text, outcome.FollowUps, before.Select(DraftTools.View).ToArray(),
                drafts.Select(DraftTools.View).ToArray(), result.Error, watch.ElapsedMilliseconds,
                result.InputTokens, result.CachedInputTokens, result.OutputTokens, tone, business, businessFailures));
            if (result.Text is not null)
                evidence.Add(new(evidence.Count + 1, turn.User, result.Text, before.Select(DraftTools.View).ToArray(),
                    drafts.Select(DraftTools.View).ToArray(),
                    result.TurnHistory.OfType<GatewayAssistantMessage>().SelectMany(message => message.ToolCalls).ToArray(),
                    result.TurnHistory.OfType<GatewayToolResultMessage>().ToArray()));
        }
        return (turns, evidence);
    }

    private static bool Check(string check, TurnOutcome turn, QualityKeywords keywords)
    {
        var asks = turn.Reply.Contains('?') || turn.Reply.Contains('？');
        var itemsBefore = turn.DraftsBefore.Sum(draft => draft.Proposals.Count);
        var itemsAfter = turn.DraftsAfter.Sum(draft => draft.Proposals.Count);
        return check switch
        {
            "asksQuestion" => asks,
            "noQuestion" => !asks,
            "asksOrOffersButtons" => asks || turn.FollowUps.Count > 0,
            "hasFollowUps" => turn.FollowUps.Count is 2 or 3,
            "noFollowUps" => turn.FollowUps.Count == 0,
            "noAdvice" => !keywords.Advice.Any(turn.Reply.Contains),
            "noFormalChinese" => !keywords.Formal.Any(turn.Reply.Contains),
            "noStockEmpathy" => !keywords.StockEmpathy.Any(phrase => turn.Reply.Contains(phrase, StringComparison.OrdinalIgnoreCase)),
            "noNewDraft" => itemsAfter <= itemsBefore,
            "draftCreated" => itemsAfter > itemsBefore,
            "draftChanged" => JsonSerializer.Serialize(turn.DraftsBefore.Select(DraftTools.View))
                != JsonSerializer.Serialize(turn.DraftsAfter.Select(DraftTools.View)),
            "mentionsCurrentTime" => turn.Reply.Contains(turn.LocalTime.ToString("HH:mm")),
            "repliesInEnglish" => turn.Reply.Length > 0 && !turn.Reply.Any(ch => ch is >= '一' and <= '鿿'),
            _ => throw new InvalidOperationException($"Unknown conversation-quality check '{check}'."),
        };
    }

    private sealed record TurnOutcome(string User, string Reply, IReadOnlyList<string> FollowUps,
        IReadOnlyList<ProposalSet> DraftsBefore, IReadOnlyList<ProposalSet> DraftsAfter, DateTimeOffset LocalTime);

    private sealed record QualityTurnResult(int Turn, string User, string? Reply, IReadOnlyList<string> FollowUps,
        object[] DraftsBefore, object[] DraftsAfter, string? Error, long ElapsedMs, int InputTokens, int CachedInputTokens,
        int OutputTokens, Dictionary<string, bool> Tone, Dictionary<string, bool> Business, List<string> BusinessFailures);

    private sealed record QualitySuite(int Version, string TimeZone, QualityKeywords Keywords, QualityScenario[] Scenarios);
    private sealed record QualityKeywords(string[] Advice, string[] Formal, string[] StockEmpathy);
    private sealed record QualityScenario(string Id, string Category, string Source, int Runs, DateTimeOffset LocalTime,
        string? UserContext, QualityTurn[] Turns, string[] Criteria);
    private sealed record QualityTurn(string User, string[] Tone, string[] Business);
}
