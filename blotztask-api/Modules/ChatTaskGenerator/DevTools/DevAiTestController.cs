using System.Diagnostics;
using System.Text.Json;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

[ApiController]
public class DevAiTestController(
    IAiTaskGenerateService aiTaskGenerateService,
    DateTimeResolveService dateTimeResolveService,
    IWebHostEnvironment env) : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    [HttpPost("dev/ai-test")]
    public async Task<IActionResult> TestGenerate([FromBody] DevAiTestRequest request, CancellationToken ct)
    {
        if (!env.IsDevelopment())
            return NotFound();

        var language = request.Language ?? "English";
        var timeZone = TimeZoneInfo.Utc;

        if (!string.IsNullOrWhiteSpace(request.TimeZone))
        {
            try { timeZone = TimeZoneInfo.FindSystemTimeZoneById(request.TimeZone); }
            catch { /* fall back to UTC */ }
        }

        var userLocalTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);

        var totalSw = Stopwatch.StartNew();

        var chatContext = await aiTaskGenerateService.InitializeAsync(language, userLocalTime, timeZone, ct);

        var initMs = totalSw.ElapsedMilliseconds;

        var resolvedMessage = dateTimeResolveService.Resolve(new ResolveDateTimesRequest
        {
            Message = request.Message,
            TimeZone = timeZone
        });

        var streamChunks = new List<string>();
        var result = await aiTaskGenerateService.GenerateAiResponseStreaming(
            resolvedMessage,
            chatContext,
            chunk =>
            {
                streamChunks.Add(chunk);
                return Task.CompletedTask;
            },
            ct);

        totalSw.Stop();

        return Ok(new
        {
            result.IsSuccess,
            result.ExtractedTasks,
            result.ExtractedNotes,
            result.ErrorCode,
            result.ErrorMessage,
            StreamChunks = streamChunks,
            Timing = new
            {
                InitMs = initMs,
                TotalMs = totalSw.ElapsedMilliseconds
            }
        });
    }

    [HttpPost("dev/ai-eval")]
    public async Task<IActionResult> RunEval([FromQuery] string? caseId, CancellationToken ct)
    {
        if (!env.IsDevelopment())
            return NotFound();

        var jsonPath = Path.Combine(AppContext.BaseDirectory, "Modules", "ChatTaskGenerator", "DevTools", "eval-cases.json");
        if (!System.IO.File.Exists(jsonPath))
            return NotFound(new { error = "eval-cases.json not found", path = jsonPath });

        var json = await System.IO.File.ReadAllTextAsync(jsonPath, ct);
        var allCases = JsonSerializer.Deserialize<List<EvalCase>>(json, JsonOptions) ?? [];

        if (!string.IsNullOrWhiteSpace(caseId))
            allCases = allCases.Where(c => c.Id.Equals(caseId, StringComparison.OrdinalIgnoreCase)).ToList();

        if (allCases.Count == 0)
            return NotFound(new { error = $"No eval case found with id '{caseId}'" });

        var scorecard = new EvalScorecard { TotalCases = allCases.Count };
        var totalSw = Stopwatch.StartNew();

        foreach (var evalCase in allCases)
        {
            var caseResult = await RunSingleCase(evalCase, ct);
            scorecard.Results.Add(caseResult);
            if (caseResult.Passed) scorecard.Passed++;
            else scorecard.Failed++;
        }

        totalSw.Stop();
        scorecard.TotalTimeMs = totalSw.ElapsedMilliseconds;
        scorecard.PassRate = scorecard.TotalCases > 0
            ? $"{(double)scorecard.Passed / scorecard.TotalCases * 100:F1}%"
            : "N/A";

        return Ok(scorecard);
    }

    private async Task<EvalCaseResult> RunSingleCase(EvalCase evalCase, CancellationToken ct)
    {
        var caseResult = new EvalCaseResult { Id = evalCase.Id };
        var caseSw = Stopwatch.StartNew();

        try
        {
            var userLocalTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.Utc);
            var chatContext = await aiTaskGenerateService.InitializeAsync("English", userLocalTime, TimeZoneInfo.Utc, ct);

            var resolvedMessage = dateTimeResolveService.Resolve(new ResolveDateTimesRequest
            {
                Message = evalCase.Input,
                TimeZone = TimeZoneInfo.Utc
            });

            var result = await aiTaskGenerateService.GenerateAiResponseStreaming(
                resolvedMessage,
                chatContext,
                _ => Task.CompletedTask,
                ct);

            caseSw.Stop();
            caseResult.TimeMs = caseSw.ElapsedMilliseconds;

            CheckTaskCount(evalCase, result, caseResult);
            CheckNoteCount(evalCase, result, caseResult);
            CheckTaskExpectations(evalCase, result, caseResult);

            caseResult.Passed = caseResult.Checks.All(c => c.Passed);
        }
        catch (Exception ex)
        {
            caseSw.Stop();
            caseResult.TimeMs = caseSw.ElapsedMilliseconds;
            caseResult.Passed = false;
            caseResult.Checks.Add(new EvalCheck
            {
                Field = "exception",
                Expected = "no error",
                Actual = ex.Message,
                Passed = false
            });
        }

        return caseResult;
    }

    private static void CheckTaskCount(EvalCase evalCase, AiGenerateMessage result, EvalCaseResult caseResult)
    {
        var actual = result.ExtractedTasks?.Count ?? 0;
        caseResult.Checks.Add(new EvalCheck
        {
            Field = "taskCount",
            Expected = evalCase.ExpectedTaskCount.ToString(),
            Actual = actual.ToString(),
            Passed = actual == evalCase.ExpectedTaskCount
        });
    }

    private static void CheckNoteCount(EvalCase evalCase, AiGenerateMessage result, EvalCaseResult caseResult)
    {
        var actual = result.ExtractedNotes?.Count ?? 0;
        caseResult.Checks.Add(new EvalCheck
        {
            Field = "noteCount",
            Expected = evalCase.ExpectedNoteCount.ToString(),
            Actual = actual.ToString(),
            Passed = actual == evalCase.ExpectedNoteCount
        });
    }

    private static void CheckTaskExpectations(EvalCase evalCase, AiGenerateMessage result, EvalCaseResult caseResult)
    {
        var tasks = result.ExtractedTasks ?? [];

        for (var i = 0; i < evalCase.Expectations.Count; i++)
        {
            var expectation = evalCase.Expectations[i];

            if (i >= tasks.Count)
            {
                caseResult.Checks.Add(new EvalCheck
                {
                    Field = $"task[{i}]",
                    Expected = "task exists",
                    Actual = "missing",
                    Passed = false
                });
                continue;
            }

            var task = tasks[i];

            if (expectation.TitleContains.Count > 0)
            {
                var titleMatch = expectation.TitleContains.Any(keyword =>
                    task.Title.Contains(keyword, StringComparison.OrdinalIgnoreCase));
                caseResult.Checks.Add(new EvalCheck
                {
                    Field = $"task[{i}].titleContains",
                    Expected = string.Join(" | ", expectation.TitleContains),
                    Actual = task.Title,
                    Passed = titleMatch
                });
            }

            if (expectation.StartTimeHour.HasValue)
            {
                var actualHour = task.StartTime.Hour;
                caseResult.Checks.Add(new EvalCheck
                {
                    Field = $"task[{i}].startTimeHour",
                    Expected = expectation.StartTimeHour.Value.ToString(),
                    Actual = actualHour.ToString(),
                    Passed = actualHour == expectation.StartTimeHour.Value
                });
            }

            if (expectation.StartTimeMinute.HasValue)
            {
                var actualMinute = task.StartTime.Minute;
                caseResult.Checks.Add(new EvalCheck
                {
                    Field = $"task[{i}].startTimeMinute",
                    Expected = expectation.StartTimeMinute.Value.ToString(),
                    Actual = actualMinute.ToString(),
                    Passed = actualMinute == expectation.StartTimeMinute.Value
                });
            }

            if (expectation.Label is not null)
            {
                var actualLabel = task.LabelName.ToString();
                caseResult.Checks.Add(new EvalCheck
                {
                    Field = $"task[{i}].label",
                    Expected = expectation.Label,
                    Actual = actualLabel,
                    Passed = actualLabel.Equals(expectation.Label, StringComparison.OrdinalIgnoreCase)
                });
            }
        }
    }
}

public class DevAiTestRequest
{
    public required string Message { get; set; }
    public string? Language { get; set; }
    public string? TimeZone { get; set; }
}
