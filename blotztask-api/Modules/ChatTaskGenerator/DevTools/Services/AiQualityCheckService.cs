using System.Diagnostics;
using System.Text.Json;
using BlotzTask.Modules.ChatTaskGenerator.DevTools.Checks;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;

namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

public class AiQualityCheckService(
    IAiTaskGenerateService aiTaskGenerateService,
    DateTimeResolveService dateTimeResolveService,
    IConfiguration configuration) : IAiQualityCheckService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
// TODO: Will this be very fragile is there a better way of doing this ?
    private static readonly string QualityCheckCasesPath = Path.Combine(
        AppContext.BaseDirectory, "Modules", "ChatTaskGenerator", "DevTools", "quality-check-cases.json");

    private int BatchSize => configuration.GetValue<int>("DevTools:QualityCheckBatchSize", 5);

    public async Task<QualityCheckRunResult> RunQualityCheckAsync(QualityCheckRequest request, string? caseId, CancellationToken ct)
    {
        if (!File.Exists(QualityCheckCasesPath))
            return QualityCheckRunResult.Fail("quality-check-cases.json not found");

        var allCases = await LoadCasesAsync(caseId, ct);

        if (allCases.Count == 0)
        {
            var message = string.IsNullOrWhiteSpace(caseId)
                ? "No test cases found in quality-check-cases.json"
                : $"No quality check case found with id '{caseId}'";
            return QualityCheckRunResult.Fail(message);
        }

        var scorecard = new QualityCheckScorecard { TotalCases = allCases.Count };
        var totalSw = Stopwatch.StartNew();

        var timeZone = ResolveTimeZone(request.TimeZone);

        foreach (var batch in allCases.Chunk(BatchSize))
        {
            var batchResults = await Task.WhenAll(batch.Select(c => RunSingleCaseAsync(c, timeZone, ct)));
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

        if (scorecard.Results.Count > 0)
        {
            scorecard.AvgAiTimeMs = (long)scorecard.Results.Average(r => r.AiTimeMs);
            scorecard.MaxAiTimeMs = scorecard.Results.Max(r => r.AiTimeMs);
        }

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

    private async Task<QualityCheckCaseResult> RunSingleCaseAsync(QualityCheckCase qualityCheckCase, TimeZoneInfo timeZone, CancellationToken ct)
    {
        var caseResult = new QualityCheckCaseResult { Id = qualityCheckCase.Id, Input = qualityCheckCase.Input };
        var caseSw = Stopwatch.StartNew();

        try
        {
            var userLocalTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);

            var initSw = Stopwatch.StartNew();
            var chatContext = await aiTaskGenerateService.InitializeAsync("English", userLocalTime, timeZone, ct);
            initSw.Stop();

            var resolvedMessage = dateTimeResolveService.Resolve(new ResolveDateTimesRequest
            {
                Message = qualityCheckCase.Input,
                TimeZone = timeZone,
                ReferenceTime = userLocalTime
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
            QualityCheckRunner.CheckTaskExpectations(qualityCheckCase, result, caseResult, userLocalTime);

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
        catch (TimeZoneNotFoundException) { return TimeZoneInfo.Utc; }
        catch (InvalidTimeZoneException) { return TimeZoneInfo.Utc; }
    }
}
