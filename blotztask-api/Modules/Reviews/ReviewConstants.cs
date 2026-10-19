using BlotzTask.Modules.Reviews.Enums;

namespace BlotzTask.Modules.Reviews;

public static class ReviewConstants
{
    // Below this many tasks in the AI input, the letter is unavoidably thin, so the app shows a
    // "log more tasks" hint. Weekly periods are shorter, so the bar is lower.
    public const int WeeklyLowActivityTaskThreshold = 3;
    public const int MonthlyLowActivityTaskThreshold = 10;

    // Three is enough to break a rut without crowding the prompt.
    public const int RecentThemesToAvoid = 3;

    // App opens are only recorded from the release that added the activity call (early October
    // 2026), so earlier months have no rows and hide the stat. The release month is shown on
    // purpose even though it undercounts for users who updated late. Null would hide it everywhere.
    public static readonly DateOnly? ActivityTrackingStartDate = new(2026, 10, 1);

    public static int LowActivityTaskThreshold(ReviewPeriodType periodType) => periodType switch
    {
        ReviewPeriodType.Weekly => WeeklyLowActivityTaskThreshold,
        ReviewPeriodType.Monthly => MonthlyLowActivityTaskThreshold,
        _ => MonthlyLowActivityTaskThreshold,
    };
}
