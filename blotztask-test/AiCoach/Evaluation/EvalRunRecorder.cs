using BlotzTask.Modules.AiCoach.Domain.Conversations;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BlotzTask.Tests.AiCoach.Evaluation;

public sealed record EvalCaseRunRecord(
    string CaseId,
    string Title,
    string Mode,
    string Layer,
    int RunIndex,
    string Status,
    IReadOnlyList<EvalCheckResult> Checks,
    IReadOnlyList<TurnRecord> Turns,
    string? Deployment,
    DateTimeOffset RecordedAt);

public sealed record TurnRecord(
    int Turn,
    string User,
    string Assistant,
    string CompletionReason,
    string? FinalStrategy,
    string? DecisionType,
    string? ReasonCode,
    string? Question,
    string? QuestionTopic,
    IReadOnlyList<ProposalRecord> Proposals,
    bool FallbackUsed,
    int ModelCalls,
    int SchemaCorrections,
    int Regenerations,
    int ProposalRegenerations,
    int TotalTokens,
    string PhaseAfter,
    bool PendingSetAfter,
    JudgeRecord? Judge,
    IReadOnlyList<string?> RawModelOutputs);

public sealed record ProposalRecord(string Title, string Date, string Start, string End);

public sealed record JudgeRecord(QuestionJudgement? Question, ResponseJudgement? Response);

/// <summary>
/// Eval plan §12: no dashboard — one JSON line per case run under
/// blotztask-test/TestResults/ai-coach-evals/ (git-ignored), plus a latest-run pointer. The
/// GO / CONDITIONAL GO / NO-GO summary is computed from that file after the run.
/// </summary>
public static class EvalRunRecorder
{
    public static readonly string RunId = DateTime.UtcNow.ToString("yyyyMMdd-HHmmss");

    private static readonly object Gate = new();

    private static readonly JsonSerializerOptions Json = new()
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        Converters = { new JsonStringEnumConverter() },
    };

    public static string OutputDirectory { get; } = ResolveOutputDirectory();

    public static string RunFile => Path.Combine(OutputDirectory, $"run-{RunId}.jsonl");

    public static void Record(EvalCaseRunRecord record)
    {
        lock (Gate)
        {
            Directory.CreateDirectory(OutputDirectory);
            File.AppendAllText(RunFile, JsonSerializer.Serialize(record, Json) + Environment.NewLine);
            File.WriteAllText(Path.Combine(OutputDirectory, "latest-run.txt"), RunFile + Environment.NewLine);
        }
    }

    public static EvalCaseRunRecord Build(
        string caseId,
        string title,
        AiCoachMode mode,
        string layer,
        int runIndex,
        AiCoachEvalHarness harness,
        IReadOnlyList<EvalCheckResult> checks,
        IReadOnlyDictionary<int, JudgeRecord>? judgements = null,
        string? deployment = null)
    {
        var hardFailure = checks.Any(c => !c.Passed && c.Severity == CheckSeverity.Hard);
        var qualityWarning = checks.Any(c => !c.Passed && c.Severity == CheckSeverity.Soft && c.Category != "STABILITY");
        var recovered = checks.Any(c => !c.Passed && c.Category == "STABILITY");
        var status = hardFailure ? "FAIL"
            : qualityWarning ? "QUALITY_WARNING"
            : recovered ? "RECOVERED_WITH_ISSUES"
            : "PASS";

        var turns = harness.Turns.Select(t =>
        {
            var outcome = t.Outcome;
            JudgeRecord? judge = null;
            judgements?.TryGetValue(t.TurnIndex, out judge);
            return new TurnRecord(
                t.TurnIndex,
                t.UserMessage,
                t.AssistantMessage,
                t.ModelResult.CompletionReason.ToString(),
                outcome?.FinalStrategy.ToString(),
                outcome?.DecisionType.ToString(),
                outcome?.ReasonCode.ToString(),
                outcome?.Question,
                outcome?.QuestionTopic?.ToString(),
                (outcome?.AcceptedProposals ?? []).Select(p => new ProposalRecord(
                    p.Title, p.Date.ToString("yyyy-MM-dd"), p.StartTime.ToString("HH:mm"), p.EndTime.ToString("HH:mm"))).ToList(),
                outcome?.FallbackUsed ?? false,
                t.ModelResult.ModelCallCount,
                t.ModelResult.SchemaCorrectionCount,
                t.ModelResult.RegenerationCount,
                t.ModelResult.ProposalRegenerationCount,
                t.ModelResult.TotalTokens,
                t.StateAfter.Phase.ToString(),
                t.StateAfter.CurrentProposalSet is { IsOpen: true },
                judge,
                t.ModelCalls.Select(c => c.RawOutput).ToList());
        }).ToList();

        return new EvalCaseRunRecord(
            caseId, title, mode.ToString(), layer, runIndex, status, checks, turns, deployment, DateTimeOffset.UtcNow);
    }

    private static string ResolveOutputDirectory()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            if (File.Exists(Path.Combine(dir.FullName, "BlotzTask.Tests.csproj")))
                return Path.Combine(dir.FullName, "TestResults", "ai-coach-evals");
        }

        return Path.Combine(AppContext.BaseDirectory, "TestResults", "ai-coach-evals");
    }
}
