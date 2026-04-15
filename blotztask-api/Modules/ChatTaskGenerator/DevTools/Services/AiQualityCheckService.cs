using System.Diagnostics;
using System.Text.Json;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;

namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

public class AiQualityCheckService(
    IAiTaskGenerateService aiTaskGenerateService,
    DateTimeResolveService dateTimeResolveService,
    IConfiguration configuration) : IAiQualityCheckService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private static readonly string QualityCheckCasesPath = Path.Combine(
        AppContext.BaseDirectory, "Modules", "ChatTaskGenerator", "DevTools", "quality-check-cases.json");

    private int BatchSize => configuration.GetValue<int>("DevTools:QualityCheckBatchSize", 5);

    public async Task<QualityCheckRunResult> RunQualityCheckAsync(string? caseId, CancellationToken ct)
    {
        if (!File.Exists(QualityCheckCasesPath))
            return QualityCheckRunResult.Fail("quality-check-cases.json not found");

        var allCases = await LoadCasesAsync(caseId, ct);

        if (allCases.Count == 0)
            return QualityCheckRunResult.Fail($"No quality check case found with id '{caseId}'");

        var scorecard = new QualityCheckScorecard { TotalCases = allCases.Count };
        var totalSw = Stopwatch.StartNew();

        foreach (var batch in allCases.Chunk(BatchSize))
        {
            var batchResults = await Task.WhenAll(batch.Select(c => RunSingleCaseAsync(c, ct)));
            foreach (var caseResult in batchResults)
            {
                scorecard.Results.Add(caseResult);
                if (caseResult.Passed) scorecard.Passed++;
                else scorecard.Failed++;
            }
        }

        totalSw.Stop();
        scorecard.TotalTimeMs = totalSw.ElapsedMilliseconds;
        scorecard.PassRate = scorecard.TotalCases > 0
            ? $"{(double)scorecard.Passed / scorecard.TotalCases * 100:F1}%"
            : "N/A";

        return QualityCheckRunResult.Success(scorecard);
    }

    private async Task<List<QualityCheckCase>> LoadCasesAsync(string? caseId, CancellationToken ct)
    {
        var json = await File.ReadAllTextAsync(QualityCheckCasesPath, ct);
        var allCases = JsonSerializer.Deserialize<List<QualityCheckCase>>(json, JsonOptions) ?? [];

        if (!string.IsNullOrWhiteSpace(caseId))
            allCases = allCases.Where(c => c.Id.Equals(caseId, StringComparison.OrdinalIgnoreCase)).ToList();

        return allCases;
    }

    private async Task<QualityCheckCaseResult> RunSingleCaseAsync(QualityCheckCase qualityCheckCase, CancellationToken ct)
    {
        var caseResult = new QualityCheckCaseResult { Id = qualityCheckCase.Id };
        var caseSw = Stopwatch.StartNew();

        try
        {
            var userLocalTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.Utc);

            var initSw = Stopwatch.StartNew();
            var chatContext = await aiTaskGenerateService.InitializeAsync("English", userLocalTime, TimeZoneInfo.Utc, ct);
            initSw.Stop();

            var resolvedMessage = dateTimeResolveService.Resolve(new ResolveDateTimesRequest
            {
                Message = qualityCheckCase.Input,
                TimeZone = TimeZoneInfo.Utc
            });

            var aiSw = Stopwatch.StartNew();
            var result = await aiTaskGenerateService.GenerateAiResponse(resolvedMessage, chatContext, ct);
            aiSw.Stop();

            caseSw.Stop();
            caseResult.TotalTimeMs = caseSw.ElapsedMilliseconds;
            caseResult.InitTimeMs = initSw.ElapsedMilliseconds;
            caseResult.AiTimeMs = aiSw.ElapsedMilliseconds;

            caseResult.ExtractedTasks = (result.ExtractedTasks ?? [])
                .Select(t => new QualityCheckExtractedTask
                {
                    Title = t.Title,
                    Description = t.Description,
                    StartTime = t.StartTime,
                    EndTime = t.EndTime,
                    LabelName = t.LabelName.ToString()
                })
                .ToList();

            QualityCheckRunner.CheckTaskCount(qualityCheckCase, result, caseResult);
            QualityCheckRunner.CheckNoteCount(qualityCheckCase, result, caseResult);
            QualityCheckRunner.CheckTaskExpectations(qualityCheckCase, result, caseResult);

            caseResult.Passed = caseResult.Checks.All(c => c.Passed);
        }
        catch (Exception ex)
        {
            caseSw.Stop();
            caseResult.TotalTimeMs = caseSw.ElapsedMilliseconds;
            caseResult.Passed = false;
            caseResult.Checks.Add(new QualityCheckItem
            {
                Field = "exception",
                Expected = "no error",
                Actual = ex.Message,
                Passed = false
            });
        }

        return caseResult;
    }

    private static TimeZoneInfo ResolveTimeZone(string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
            return TimeZoneInfo.Utc;

        try { return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId); }
        catch { return TimeZoneInfo.Utc; }
    }
}
