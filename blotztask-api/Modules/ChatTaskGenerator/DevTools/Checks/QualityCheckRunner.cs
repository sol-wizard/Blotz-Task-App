using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.DevTools;

namespace BlotzTask.Modules.ChatTaskGenerator.DevTools.Checks;

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

    public static void CheckTaskExpectations(QualityCheckCase qualityCheckCase, AiGenerateMessage result, QualityCheckCaseResult caseResult, DateTime userLocalTime)
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
                var expectedDate = userLocalTime.Date.AddDays(expectation.StartDateOffset.Value);
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
                var expectedTime = userLocalTime.AddMinutes(expectation.MinutesFromNow.Value);
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

            if (expectation.ExpectedDayOfWeek is not null)
            {
                var actualDayOfWeek = task.StartTime.DayOfWeek.ToString();
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"task[{i}].dayOfWeek",
                    Expected = expectation.ExpectedDayOfWeek,
                    Actual = actualDayOfWeek,
                    Passed = actualDayOfWeek.Equals(expectation.ExpectedDayOfWeek, StringComparison.OrdinalIgnoreCase)
                });
            }

            if (expectation.StartTimeHourMin.HasValue || expectation.StartTimeHourMax.HasValue)
            {
                var actualHour = task.StartTime.Hour;
                var min = expectation.StartTimeHourMin ?? 0;
                var max = expectation.StartTimeHourMax ?? 23;
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"task[{i}].startTimeHourRange",
                    Expected = $"{min:D2}:00 – {max:D2}:00",
                    Actual = task.StartTime.ToString("HH:mm"),
                    Passed = actualHour >= min && actualHour <= max
                });
            }
        }
    }

    // SPIKE (#1462, throwaway): recurring-extraction assertions.
    public static void CheckRecurringCount(QualityCheckCase qualityCheckCase, AiGenerateMessage result, QualityCheckCaseResult caseResult)
    {
        var actual = result.ExtractedRecurringTasks?.Count ?? 0;
        caseResult.Checks.Add(new QualityCheckItem
        {
            Field = "recurringTaskCount",
            Expected = qualityCheckCase.ExpectedRecurringTaskCount.ToString(),
            Actual = actual.ToString(),
            Passed = actual == qualityCheckCase.ExpectedRecurringTaskCount
        });
    }

    public static void CheckRecurringExpectations(QualityCheckCase qualityCheckCase, AiGenerateMessage result, QualityCheckCaseResult caseResult)
    {
        var recurring = result.ExtractedRecurringTasks ?? [];

        for (var i = 0; i < qualityCheckCase.RecurringExpectations.Count; i++)
        {
            var expectation = qualityCheckCase.RecurringExpectations[i];

            if (i >= recurring.Count)
            {
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"recurring[{i}]",
                    Expected = "recurring task exists",
                    Actual = "missing",
                    Passed = false
                });
                continue;
            }

            var task = recurring[i];

            if (expectation.TitleContains.Count > 0)
            {
                var titleMatch = expectation.TitleContains.Any(keyword =>
                    task.Title.Contains(keyword, StringComparison.OrdinalIgnoreCase));
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"recurring[{i}].titleContains",
                    Expected = string.Join(" | ", expectation.TitleContains),
                    Actual = task.Title,
                    Passed = titleMatch
                });
            }

            if (expectation.Label is not null)
            {
                var actualLabel = task.LabelName.ToString();
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"recurring[{i}].label",
                    Expected = expectation.Label,
                    Actual = actualLabel,
                    Passed = actualLabel.Equals(expectation.Label, StringComparison.OrdinalIgnoreCase)
                });
            }

            if (expectation.Frequency is not null)
            {
                var actualFrequency = task.Frequency.ToString();
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"recurring[{i}].frequency",
                    Expected = expectation.Frequency,
                    Actual = actualFrequency,
                    Passed = actualFrequency.Equals(expectation.Frequency, StringComparison.OrdinalIgnoreCase)
                });
            }

            if (expectation.Interval.HasValue)
            {
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"recurring[{i}].interval",
                    Expected = expectation.Interval.Value.ToString(),
                    Actual = task.Interval.ToString(),
                    Passed = task.Interval == expectation.Interval.Value
                });
            }

            if (expectation.DaysOfWeek.HasValue)
            {
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"recurring[{i}].daysOfWeek",
                    Expected = expectation.DaysOfWeek.Value.ToString(),
                    Actual = task.DaysOfWeek?.ToString() ?? "null",
                    Passed = task.DaysOfWeek == expectation.DaysOfWeek.Value
                });
            }

            if (expectation.DayOfMonth.HasValue)
            {
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"recurring[{i}].dayOfMonth",
                    Expected = expectation.DayOfMonth.Value.ToString(),
                    Actual = task.DayOfMonth?.ToString() ?? "null",
                    Passed = task.DayOfMonth == expectation.DayOfMonth.Value
                });
            }

            if (expectation.StartTimeHour.HasValue)
            {
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"recurring[{i}].startTimeHour",
                    Expected = expectation.StartTimeHour.Value.ToString(),
                    Actual = task.TemplateStartTime.Hour.ToString(),
                    Passed = task.TemplateStartTime.Hour == expectation.StartTimeHour.Value
                });
            }

            if (expectation.TimeType is not null)
            {
                var actualTimeType = task.TimeType.ToString();
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"recurring[{i}].timeType",
                    Expected = expectation.TimeType,
                    Actual = actualTimeType,
                    Passed = actualTimeType.Equals(expectation.TimeType, StringComparison.OrdinalIgnoreCase)
                });
            }

            if (expectation.StartDateMatchesTemplate == true)
            {
                var templateDate = DateOnly.FromDateTime(task.TemplateStartTime.Date);
                caseResult.Checks.Add(new QualityCheckItem
                {
                    Field = $"recurring[{i}].startDateMatchesTemplate",
                    Expected = $"startDate == {templateDate:yyyy-MM-dd}",
                    Actual = task.StartDate.ToString("yyyy-MM-dd"),
                    Passed = task.StartDate == templateDate
                });
            }
        }
    }

    // Reads the creation outcome the eval service recorded after invoking the real
    // CreateRecurringTaskCommandHandler — proves the extracted draft satisfies the strict endpoint.
    public static void CheckRecurringCreation(QualityCheckCase qualityCheckCase, QualityCheckCaseResult caseResult)
    {
        if (qualityCheckCase.ExpectedRecurringTaskCount <= 0) return;

        for (var i = 0; i < caseResult.ExtractedRecurringTasks.Count; i++)
        {
            var created = caseResult.ExtractedRecurringTasks[i];
            caseResult.Checks.Add(new QualityCheckItem
            {
                Field = $"recurring[{i}].created",
                Expected = "created via CreateRecurringTask endpoint",
                Actual = created.Created
                    ? $"created (series {created.SeriesId}, task {created.RecurringTaskId})"
                    : $"rejected: {created.CreationError}",
                Passed = created.Created
            });
        }
    }
}
