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
}

public class QualityCheckRequest
{
    public string? TimeZone { get; set; }
}

public class QualityCheckScorecard
{
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
