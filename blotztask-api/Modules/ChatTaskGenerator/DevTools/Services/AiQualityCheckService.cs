using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Text.Json;
using BlotzTask.Modules.ChatTaskGenerator.DevTools.Checks;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Modules.Tasks.Commands.RecurringTasks;
using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

public class AiQualityCheckService(
    IServiceScopeFactory serviceScopeFactory,
    DateTimeResolveService dateTimeResolveService,
    IConfiguration configuration) : IAiQualityCheckService
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };
// TODO: Will this be very fragile is there a better way of doing this ?
    private static readonly string QualityCheckCasesPath = Path.Combine(
        AppContext.BaseDirectory, "Modules", "ChatTaskGenerator", "DevTools", "quality-check-cases.json");

    private int BatchSize => configuration.GetValue<int>("DevTools:QualityCheckBatchSize", 5);

    public async Task<QualityCheckRunResult> RunQualityCheckAsync(
        QualityCheckRequest request,
        string? caseId,
        Guid userId,
        CancellationToken ct)
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

        var scorecard = new QualityCheckScorecard
        {
            TotalCases = allCases.Count,
            ModelId = configuration["AzureOpenAI:AiModels:TaskGeneration:DeploymentId"] ?? "unknown"
        };
        var totalSw = Stopwatch.StartNew();

        var timeZone = ResolveTimeZone(request.TimeZone);
        var reliabilityRuns = Math.Max(1, request.ReliabilityRuns);

        List<QualityCheckCaseResult> finalResults;

        if (reliabilityRuns == 1)
        {
            finalResults = await RunAllCasesOnceAsync(allCases, timeZone, userId, ct);
        }
        else
        {
            var allRuns = await Task.WhenAll(
                Enumerable.Range(0, reliabilityRuns)
                    .Select(_ => RunAllCasesOnceAsync(allCases, timeZone, userId, ct)));

            finalResults = allCases.Select(qualityCase =>
            {
                var caseRuns = allRuns.Select(run => run.First(r => r.Id == qualityCase.Id)).ToList();
                var passCount = caseRuns.Count(r => r.Passed);
                return new QualityCheckCaseResult
                {
                    Id = qualityCase.Id,
                    Input = qualityCase.Input,
                    Passed = passCount == reliabilityRuns,
                    AiTimeMs = (long)caseRuns.Average(r => r.AiTimeMs),
                    InitTimeMs = (long)caseRuns.Average(r => r.InitTimeMs),
                    TotalTimeMs = (long)caseRuns.Average(r => r.TotalTimeMs),
                    TotalRuns = reliabilityRuns,
                    PassCount = passCount,
                    ReliabilityRate = $"{(double)passCount / reliabilityRuns * 100:F0}%",
                    Checks = [],
                    ExtractedTasks = []
                };
            }).ToList();
        }

        foreach (var caseResult in finalResults)
        {
            scorecard.Results.Add(caseResult);
            if (caseResult.Passed) scorecard.Passed++;
            else scorecard.Failed++;
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
            scorecard.TotalInputTokens = scorecard.Results.Sum(r => r.InputTokens);
            scorecard.TotalOutputTokens = scorecard.Results.Sum(r => r.OutputTokens);
            scorecard.TotalTokens = scorecard.Results.Sum(r => r.TotalTokens);
        }

        return QualityCheckRunResult.Success(scorecard);
    }

    private async Task<List<QualityCheckCaseResult>> RunAllCasesOnceAsync(
        IReadOnlyList<QualityCheckCase> cases,
        TimeZoneInfo timeZone,
        Guid userId,
        CancellationToken ct)
    {
        var results = new List<QualityCheckCaseResult>();
        foreach (var batch in cases.Chunk(BatchSize))
        {
            var batchResults = await Task.WhenAll(batch.Select(c => RunSingleCaseAsync(c, timeZone, userId, ct)));
            results.AddRange(batchResults);
        }
        return results;
    }

    private async Task<List<QualityCheckCase>> LoadCasesAsync(string? caseId, CancellationToken ct)
    {
        var json = await File.ReadAllTextAsync(QualityCheckCasesPath, ct);
        var allCases = JsonSerializer.Deserialize<List<QualityCheckCase>>(json, JsonOptions) ?? [];

        if (!string.IsNullOrWhiteSpace(caseId))
            allCases = allCases.Where(c => c.Id.Equals(caseId, StringComparison.OrdinalIgnoreCase)).ToList();

        return allCases;
    }

    private async Task<QualityCheckCaseResult> RunSingleCaseAsync(
        QualityCheckCase qualityCheckCase,
        TimeZoneInfo timeZone,
        Guid userId,
        CancellationToken ct)
    {
        var caseResult = new QualityCheckCaseResult { Id = qualityCheckCase.Id, Input = qualityCheckCase.Input };
        var caseSw = Stopwatch.StartNew();
       

        try
        {
            await using var scope = serviceScopeFactory.CreateAsyncScope();
            var aiTaskGenerateService = scope.ServiceProvider.GetRequiredService<IAiChatService>();

            var userLocalTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);
            var initSw = Stopwatch.StartNew();
            var chatContext = await aiTaskGenerateService.InitializeAsync("English", timeZone, ct);
            initSw.Stop();

            var resolvedMessage = dateTimeResolveService.Resolve(new ResolveDateTimesRequest
            {
                Message = qualityCheckCase.Input,
                TimeZone = timeZone,
                ReferenceTime = userLocalTime
            });

            var aiSw = Stopwatch.StartNew();
            var result = await aiTaskGenerateService.GenerateAiResponse(userId, resolvedMessage, chatContext, ct);
            aiSw.Stop();

            caseSw.Stop();
            caseResult.TotalTimeMs = caseSw.ElapsedMilliseconds;
           caseResult.InitTimeMs = Math.Max(1, initSw.ElapsedMilliseconds);
            caseResult.AiTimeMs = aiSw.ElapsedMilliseconds;

            caseResult.InputTokens = result.InputTokens;
            caseResult.OutputTokens = result.OutputTokens;
            caseResult.TotalTokens = result.TotalTokens;

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

            caseResult.ExtractedNotes = (result.ExtractedNotes ?? [])
                .Select(n => n.Text)
                .ToList();

            // SPIKE (#1462, throwaway): capture each extracted recurring draft AND attempt to create it
            // through the real CreateRecurringTaskCommandHandler, so the scorecard proves the strict
            // endpoint accepts what the model produced (not just that extraction happened).
            var createHandler = scope.ServiceProvider.GetRequiredService<CreateRecurringTaskCommandHandler>();
            caseResult.ExtractedRecurringTasks = await CaptureAndCreateRecurringAsync(
                result.ExtractedRecurringTasks ?? [], createHandler, timeZone, userId, ct);

            QualityCheckRunner.CheckTaskCount(qualityCheckCase, result, caseResult);
            QualityCheckRunner.CheckNoteCount(qualityCheckCase, result, caseResult);
            QualityCheckRunner.CheckTaskExpectations(qualityCheckCase, result, caseResult, userLocalTime);
            QualityCheckRunner.CheckRecurringCount(qualityCheckCase, result, caseResult);
            QualityCheckRunner.CheckRecurringExpectations(qualityCheckCase, result, caseResult);
            QualityCheckRunner.CheckRecurringCreation(qualityCheckCase, caseResult);

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

    // SPIKE (#1462, throwaway): map each extracted recurring draft to the strict endpoint request,
    // attempt real creation, and record the outcome (created ids or the ValidationException message).
    private static async Task<List<QualityCheckExtractedRecurringTask>> CaptureAndCreateRecurringAsync(
        IReadOnlyList<ExtractedRecurringTask> drafts,
        CreateRecurringTaskCommandHandler createHandler,
        TimeZoneInfo timeZone,
        Guid userId,
        CancellationToken ct)
    {
        var captured = new List<QualityCheckExtractedRecurringTask>();

        foreach (var draft in drafts)
        {
            var item = new QualityCheckExtractedRecurringTask
            {
                Title = draft.Title,
                Frequency = draft.Frequency.ToString(),
                Interval = draft.Interval,
                DaysOfWeek = draft.DaysOfWeek,
                DayOfMonth = draft.DayOfMonth,
                StartDate = draft.StartDate,
                EndDate = draft.EndDate,
                TemplateStartTime = draft.TemplateStartTime,
                TemplateEndTime = draft.TemplateEndTime,
                TimeType = draft.TimeType.ToString(),
                LabelName = draft.LabelName.ToString()
            };

            try
            {
                var request = MapToCreateRequest(draft, timeZone);
                var res = await createHandler.Handle(
                    new CreateRecurringTaskCommand { UserId = userId, TaskDetails = request }, ct);
                item.Created = true;
                item.SeriesId = res.SeriesId;
                item.RecurringTaskId = res.RecurringTaskId;
            }
            catch (ValidationException ex)
            {
                item.Created = false;
                item.CreationError = ex.Message;
            }

            captured.Add(item);
        }

        return captured;
    }

    private static CreateRecurringTaskRequest MapToCreateRequest(ExtractedRecurringTask draft, TimeZoneInfo timeZone)
    {
        // Naive local wall-clock draft -> DateTimeOffset using the session timezone; ScheduleTimeZoneId
        // is the same zone. This is the assembly step that mobile would perform from the device timezone.
        var startLocal = DateTime.SpecifyKind(draft.TemplateStartTime, DateTimeKind.Unspecified);
        var templateStart = new DateTimeOffset(startLocal, timeZone.GetUtcOffset(startLocal));

        DateTimeOffset? templateEnd = null;
        if (draft.TimeType == TaskTimeType.RangeTime)
        {
            var endLocal = DateTime.SpecifyKind(draft.TemplateEndTime, DateTimeKind.Unspecified);
            templateEnd = new DateTimeOffset(endLocal, timeZone.GetUtcOffset(endLocal));
        }

        return new CreateRecurringTaskRequest
        {
            Title = draft.Title,
            Description = draft.Description,
            TimeType = draft.TimeType,
            LabelId = null, // label name -> id mapping is out of scope for the spike
            TemplateStartTime = templateStart,
            TemplateEndTime = templateEnd,
            ScheduleTimeZoneId = timeZone.Id,
            Frequency = draft.Frequency,
            Interval = draft.Interval,
            DaysOfWeek = draft.DaysOfWeek,
            DayOfMonth = draft.DayOfMonth,
            StartDate = draft.StartDate,
            EndDate = draft.EndDate,
            IsDeadline = null
        };
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
