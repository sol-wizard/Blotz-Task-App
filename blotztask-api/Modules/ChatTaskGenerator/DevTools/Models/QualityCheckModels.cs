namespace BlotzTask.Modules.ChatTaskGenerator.DevTools;

public class QualityCheckCase
{
    public required string Id { get; set; }
    public required string Input { get; set; }
    public int ExpectedTaskCount { get; set; }
    public int ExpectedNoteCount { get; set; }
    public List<QualityCheckTaskExpectation> Expectations { get; set; } = [];
}

public class QualityCheckTaskExpectation
{
    public List<string> TitleContains { get; set; } = [];
    public int? StartTimeHour { get; set; }
    public int? StartTimeMinute { get; set; }
    public string? Label { get; set; }

    /// <summary>
    /// Expected number of days from today. 0 = today, 1 = tomorrow, 7 = next week, etc.
    /// </summary>
    public int? StartDateOffset { get; set; }

    /// <summary>
    /// Expected minutes from now, with an allowed tolerance window (±ToleranceMinutes).
    /// </summary>
    public int? MinutesFromNow { get; set; }
    public int ToleranceMinutes { get; set; } = 2;

    /// <summary>
    /// Expected day of week (e.g. "Saturday", "Monday"). Use this instead of StartDateOffset
    /// for inputs like "this weekend" or "next week" where the offset varies by the day the test runs.
    /// </summary>
    public string? ExpectedDayOfWeek { get; set; }

    /// <summary>
    /// Asserts that the task's start time hour falls within [StartTimeHourMin, StartTimeHourMax] (inclusive).
    /// Useful for vague inputs like "hiking this weekend" where any reasonable daytime hour is acceptable.
    /// </summary>
    public int? StartTimeHourMin { get; set; }
    public int? StartTimeHourMax { get; set; }
}

public class QualityCheckItem
{
    public required string Field { get; set; }
    public required string Expected { get; set; }
    public required string Actual { get; set; }
    public bool Passed { get; set; }
}

public class QualityCheckExtractedTask
{
    public required string Title { get; set; }
    public string Description { get; set; } = "";
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public required string LabelName { get; set; }
}

public class QualityCheckCaseResult
{
    public required string Id { get; set; }
    public required string Input { get; set; }
    public bool Passed { get; set; }
    public long TotalTimeMs { get; set; }
    public long InitTimeMs { get; set; }
    public long AiTimeMs { get; set; }
    public List<QualityCheckItem> Checks { get; set; } = [];
    public List<QualityCheckExtractedTask> ExtractedTasks { get; set; } = [];
    public List<string> ExtractedNotes { get; set; } = [];

    /// <summary>Populated only when the run was executed multiple times for reliability testing.</summary>
    public int? TotalRuns { get; set; }
    public int? PassCount { get; set; }
    public string? ReliabilityRate { get; set; }
}

public class QualityCheckRequest
{
    public string? TimeZone { get; set; }

    /// <summary>
    /// When greater than 1, each case is run this many times in parallel and results are
    /// aggregated into a reliability score (e.g. 3/5). Defaults to 1 (single run).
    /// </summary>
    public int ReliabilityRuns { get; set; } = 1;
    public Guid UserId { get; set; }
}

public class QualityCheckScorecard
{
    public string ModelId { get; set; } = "";
    public int TotalCases { get; set; }
    public int Passed { get; set; }
    public int Failed { get; set; }
    public string PassRate { get; set; } = "";
    public long TotalTimeMs { get; set; }

    /// <summary>Average AI API call duration across all cases (pure AI latency, parallelism-agnostic).</summary>
    public long AvgAiTimeMs { get; set; }

    /// <summary>Slowest AI API call duration across all cases (bottleneck indicator).</summary>
    public long MaxAiTimeMs { get; set; }

    public List<QualityCheckCaseResult> Results { get; set; } = [];
}
