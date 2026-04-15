namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

public class EvalCase
{
    public required string Id { get; set; }
    public required string Input { get; set; }
    public int ExpectedTaskCount { get; set; }
    public int ExpectedNoteCount { get; set; }
    public List<EvalTaskExpectation> Expectations { get; set; } = [];
}

public class EvalTaskExpectation
{
    public List<string> TitleContains { get; set; } = [];
    public int? StartTimeHour { get; set; }
    public int? StartTimeMinute { get; set; }
    public string? Label { get; set; }
}

public class EvalCheck
{
    public required string Field { get; set; }
    public required string Expected { get; set; }
    public required string Actual { get; set; }
    public bool Passed { get; set; }
}

public class EvalExtractedTask
{
    public required string Title { get; set; }
    public string Description { get; set; } = "";
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public required string LabelName { get; set; }
}

public class EvalCaseResult
{
    public required string Id { get; set; }
    public bool Passed { get; set; }
    public long TotalTimeMs { get; set; }
    public long InitTimeMs { get; set; }
    public long AiTimeMs { get; set; }
    public List<EvalCheck> Checks { get; set; } = [];
    public List<EvalExtractedTask> ExtractedTasks { get; set; } = [];
}

public class EvalScorecard
{
    public int TotalCases { get; set; }
    public int Passed { get; set; }
    public int Failed { get; set; }
    public string PassRate { get; set; } = "";
    public long TotalTimeMs { get; set; }
    public List<EvalCaseResult> Results { get; set; } = [];
}

public class DevAiTestRequest
{
    public required string Message { get; set; }
    public string? Language { get; set; }
    public string? TimeZone { get; set; }
}

public class DevAiTestResult
{
    public bool IsSuccess { get; set; }
    public object? ExtractedTasks { get; set; }
    public object? ExtractedNotes { get; set; }
    public string ErrorCode { get; set; } = "";
    public string ErrorMessage { get; set; } = "";
    public DevAiTestTiming Timing { get; set; } = new();
}

public class DevAiTestTiming
{
    public long InitMs { get; set; }
    public long TotalMs { get; set; }
}
