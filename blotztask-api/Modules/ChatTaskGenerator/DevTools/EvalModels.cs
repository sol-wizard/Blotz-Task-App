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

public class EvalCaseResult
{
    public required string Id { get; set; }
    public bool Passed { get; set; }
    public long TimeMs { get; set; }
    public List<EvalCheck> Checks { get; set; } = [];
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
