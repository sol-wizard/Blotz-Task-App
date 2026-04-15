using BlotzTask.Modules.ChatTaskGenerator.Dtos;

namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

public static class EvalCheckRunner
{
    public static void CheckTaskCount(EvalCase evalCase, AiGenerateMessage result, EvalCaseResult caseResult)
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

    public static void CheckNoteCount(EvalCase evalCase, AiGenerateMessage result, EvalCaseResult caseResult)
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

    public static void CheckTaskExpectations(EvalCase evalCase, AiGenerateMessage result, EvalCaseResult caseResult)
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
