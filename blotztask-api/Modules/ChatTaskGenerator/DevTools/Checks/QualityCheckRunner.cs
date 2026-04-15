using BlotzTask.Modules.ChatTaskGenerator.Dtos;

namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

public static class QualityCheckRunner
{
    public static void CheckTaskCount(QualityCheckCase qualityCheckCase, AiGenerateMessage result, QualityCheckCaseResult caseResult)
    {
        var actual = result.ExtractedTasks?.Count ?? 0;
        caseResult.Checks.Add(new QualityCheckItem
        {
            Field = "taskCount",
            Expected = qualityCheckCase.ExpectedTaskCount.ToString(),
            Actual = actual.ToString(),
            Passed = actual == qualityCheckCase.ExpectedTaskCount
        });
    }

    public static void CheckNoteCount(QualityCheckCase qualityCheckCase, AiGenerateMessage result, QualityCheckCaseResult caseResult)
    {
        var actual = result.ExtractedNotes?.Count ?? 0;
        caseResult.Checks.Add(new QualityCheckItem
        {
            Field = "noteCount",
            Expected = qualityCheckCase.ExpectedNoteCount.ToString(),
            Actual = actual.ToString(),
            Passed = actual == qualityCheckCase.ExpectedNoteCount
        });
    }

    public static void CheckTaskExpectations(QualityCheckCase qualityCheckCase, AiGenerateMessage result, QualityCheckCaseResult caseResult)
    {
        var tasks = result.ExtractedTasks ?? [];

        for (var i = 0; i < qualityCheckCase.Expectations.Count; i++)
        {
            var expectation = qualityCheckCase.Expectations[i];

            if (i >= tasks.Count)
            {
                caseResult.Checks.Add(new QualityCheckItem
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
                caseResult.Checks.Add(new QualityCheckItem
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
                caseResult.Checks.Add(new QualityCheckItem
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
                caseResult.Checks.Add(new QualityCheckItem
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
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"task[{i}].label",
                    Expected = expectation.Label,
                    Actual = actualLabel,
                    Passed = actualLabel.Equals(expectation.Label, StringComparison.OrdinalIgnoreCase)
                });
            }

            if (expectation.StartDateOffset.HasValue)
            {
                var expectedDate = DateTime.UtcNow.Date.AddDays(expectation.StartDateOffset.Value);
                var actualDate = task.StartTime.Date;
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"task[{i}].startDate",
                    Expected = expectedDate.ToString("yyyy-MM-dd"),
                    Actual = actualDate.ToString("yyyy-MM-dd"),
                    Passed = actualDate == expectedDate
                });
            }

            if (expectation.MinutesFromNow.HasValue)
            {
                var now = DateTime.UtcNow;
                var expectedTime = now.AddMinutes(expectation.MinutesFromNow.Value);
                var tolerance = TimeSpan.FromMinutes(expectation.ToleranceMinutes);
                var diff = (task.StartTime - expectedTime).Duration();
                var passed = diff <= tolerance;
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"task[{i}].minutesFromNow",
                    Expected = $"{expectation.MinutesFromNow}min (±{expectation.ToleranceMinutes}min) → ~{expectedTime:HH:mm}",
                    Actual = task.StartTime.ToString("HH:mm"),
                    Passed = passed
                });
            }
        }
    }
}
