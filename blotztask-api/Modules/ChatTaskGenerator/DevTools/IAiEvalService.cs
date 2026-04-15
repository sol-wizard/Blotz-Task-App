namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

public interface IAiEvalService
{
    Task<DevAiTestResult> TestGenerateAsync(DevAiTestRequest request, CancellationToken ct);
    Task<EvalRunResult> RunEvalAsync(string? caseId, CancellationToken ct);
}

public class EvalRunResult
{
    public bool NotFound { get; init; }
    public string ErrorMessage { get; init; } = "";
    public EvalScorecard? Scorecard { get; init; }

    public static EvalRunResult Success(EvalScorecard scorecard) =>
        new() { Scorecard = scorecard };

    public static EvalRunResult Fail(string message) =>
        new() { NotFound = true, ErrorMessage = message };
}
