using BlotzTask.Modules.Reviews.Enums;

namespace BlotzTask.Modules.Reviews;

public static class ReviewConstants
{
    // Below this many tasks in the AI input, the letter is unavoidably thin, so the app shows a
    // "log more tasks" hint. Weekly periods are shorter, so the bar is lower.
    public const int WeeklyLowActivityTaskThreshold = 3;
    public const int MonthlyLowActivityTaskThreshold = 10;

    public static int LowActivityTaskThreshold(ReviewPeriodType periodType) => periodType switch
    {
        ReviewPeriodType.Weekly => WeeklyLowActivityTaskThreshold,
        ReviewPeriodType.Monthly => MonthlyLowActivityTaskThreshold,
        _ => MonthlyLowActivityTaskThreshold,
    };
}
