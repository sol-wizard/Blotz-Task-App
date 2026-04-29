namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

public interface IAiQualityCheckService
{
    Task<QualityCheckRunResult> RunQualityCheckAsync(QualityCheckRequest request, string? caseId, Guid userId, CancellationToken ct);
}

public class QualityCheckRunResult
{
    public bool IsError { get; init; }
    public string ErrorMessage { get; init; } = "";
    public QualityCheckScorecard? Scorecard { get; init; }

    public static QualityCheckRunResult Success(QualityCheckScorecard scorecard) =>
        new() { Scorecard = scorecard };

    public static QualityCheckRunResult Fail(string message) =>
        new() { IsError = true, ErrorMessage = message };
}
