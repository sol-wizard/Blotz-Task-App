namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

public interface IAiQualityCheckService
{
    Task<DevAiTestResult> TestGenerateAsync(DevAiTestRequest request, CancellationToken ct);
    Task<QualityCheckRunResult> RunQualityCheckAsync(string? caseId, CancellationToken ct);
}

public class QualityCheckRunResult
{
    public bool NotFound { get; init; }
    public string ErrorMessage { get; init; } = "";
    public QualityCheckScorecard? Scorecard { get; init; }

    public static QualityCheckRunResult Success(QualityCheckScorecard scorecard) =>
        new() { Scorecard = scorecard };

    public static QualityCheckRunResult Fail(string message) =>
        new() { NotFound = true, ErrorMessage = message };
}
