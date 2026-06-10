using System.Globalization;
using BlotzTask.Modules.Reviews.Enums;

namespace BlotzTask.Modules.Reviews.Domain;

/// <summary>
/// A validated review period. The end is always derived on the server from the
/// type + start, so the client can never widen or shift the window it asks for.
/// Boundaries are half-open <c>[StartUtc, EndUtc)</c>.
///
/// The start is the user's *local* midnight and carries their UTC offset
/// (e.g. <c>2026-06-08T00:00:00+08:00</c>), so the review covers their local
/// week/month. Task times are stored as instants, and the period bounds are
/// compared as instants, so the offset on the start is what makes the window local.
/// (The <c>Utc</c> suffix matches the entity columns; the value is a UTC instant
/// but is stored carrying the user's offset rather than normalized to +00:00.)
/// </summary>
public sealed class ReviewPeriod
{
    public ReviewPeriodType PeriodType { get; }
    public DateTimeOffset StartUtc { get; }
    public DateTimeOffset EndUtc { get; }

    private ReviewPeriod(ReviewPeriodType periodType, DateTimeOffset startUtc, DateTimeOffset endUtc)
    {
        PeriodType = periodType;
        StartUtc = startUtc;
        EndUtc = endUtc;
    }

    /// <summary>
    /// Validates the requested start against the period type and derives the end.
    /// Throws <see cref="ArgumentException"/> (-> 400) when the start is misaligned.
    /// </summary>
    public static ReviewPeriod Create(ReviewPeriodType periodType, DateTimeOffset periodStart)
    {
        // Validate in the offset the client supplied (do NOT convert to UTC first):
        // the start must be local midnight on a Monday / the 1st, so the window aligns
        // to the user's local week/month rather than a UTC-shifted one.
        if (periodStart.TimeOfDay != TimeSpan.Zero)
            throw new ArgumentException("Review period start must be midnight in the user's local offset.");

        // End preserves the start's offset. AddDays/AddMonths on a DateTimeOffset keeps the
        // offset fixed, so a week/month spanning a DST change can be off by an hour — accepted
        // for v1 (fully correct local boundaries need a stored IANA timezone, which is deferred).
        var end = periodType switch
        {
            ReviewPeriodType.Weekly when periodStart.DayOfWeek != DayOfWeek.Monday =>
                throw new ArgumentException("A weekly review must start on a Monday."),
            ReviewPeriodType.Weekly => periodStart.AddDays(7),

            ReviewPeriodType.Monthly when periodStart.Day != 1 =>
                throw new ArgumentException("A monthly review must start on the first day of the month."),
            ReviewPeriodType.Monthly => periodStart.AddMonths(1),

            _ => throw new ArgumentException($"Unsupported review period type: {periodType}."),
        };

        return new ReviewPeriod(periodType, periodStart, end);
    }

    /// <summary>
    /// A review is only available once its period has fully ended — the app must not
    /// offer the current or a future period.
    /// </summary>
    public bool HasEnded(DateTimeOffset nowUtc) => nowUtc >= EndUtc;

    /// <summary>
    /// An invariant-culture label for the AI prompt (weekly "Jun 3 - Jun 9", monthly
    /// "June 2026"). The end is exclusive, so the weekly range shows the last included day.
    /// Mobile builds its own localized labels from the period bounds.
    /// </summary>
    public string GetInvariantDisplayLabel() => PeriodType switch
    {
        ReviewPeriodType.Weekly =>
            $"{StartUtc.ToString("MMM d", CultureInfo.InvariantCulture)} - " +
            $"{EndUtc.AddDays(-1).ToString("MMM d", CultureInfo.InvariantCulture)}",
        ReviewPeriodType.Monthly =>
            StartUtc.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
        _ => StartUtc.ToString("o", CultureInfo.InvariantCulture),
    };
}
