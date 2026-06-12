using System.Globalization;
using BlotzTask.Modules.Reviews.Enums;

namespace BlotzTask.Modules.Reviews.Domain;

/// <summary>
/// A review period resolved server-side from an anchor date + timezone. Local boundaries
/// are computed first (Monday/1st 00:00 local), then converted to UTC for DB queries, so
/// DST/offset rules stay correct. Half-open: <c>[StartUtc, EndUtc)</c> /
/// <c>[StartLocalDate, EndLocalDateExclusive)</c>.
/// </summary>
public sealed class ReviewPeriod
{
    public ReviewPeriodType PeriodType { get; }
    public string TimeZoneId { get; }
    public DateOnly StartLocalDate { get; }
    public DateOnly EndLocalDateExclusive { get; }
    public DateTimeOffset StartUtc { get; }
    public DateTimeOffset EndUtc { get; }

    private ReviewPeriod(
        ReviewPeriodType periodType,
        string timeZoneId,
        DateOnly startLocalDate,
        DateOnly endLocalDateExclusive,
        DateTimeOffset startUtc,
        DateTimeOffset endUtc)
    {
        PeriodType = periodType;
        TimeZoneId = timeZoneId;
        StartLocalDate = startLocalDate;
        EndLocalDateExclusive = endLocalDateExclusive;
        StartUtc = startUtc;
        EndUtc = endUtc;
    }

    /// <summary>
    /// Snaps any date inside the period to its canonical local start (Monday for weekly,
    /// the 1st for monthly), derives the exclusive end, and converts both to UTC. Does not
    /// reject a non-Monday / non-1st anchor — it canonicalizes.
    /// </summary>
    public static ReviewPeriod CreateFromAnchor(
        ReviewPeriodType periodType,
        DateOnly anchorDate,
        TimeZoneInfo timeZone)
    {
        var startLocal = periodType switch
        {
            ReviewPeriodType.Weekly => SnapToMonday(anchorDate),
            ReviewPeriodType.Monthly => new DateOnly(anchorDate.Year, anchorDate.Month, 1),
            _ => throw new ArgumentException($"Unsupported review period type: {periodType}."),
        };

        var endLocalExclusive = periodType switch
        {
            ReviewPeriodType.Weekly => startLocal.AddDays(7),
            ReviewPeriodType.Monthly => startLocal.AddMonths(1),
            _ => throw new ArgumentException($"Unsupported review period type: {periodType}."),
        };

        return new ReviewPeriod(
            periodType,
            timeZone.Id,
            startLocal,
            endLocalExclusive,
            ToUtc(startLocal, timeZone),
            ToUtc(endLocalExclusive, timeZone));
    }

    /// <summary>A review is only available once its period has fully ended.</summary>
    public bool HasEnded(DateTimeOffset nowUtc) => nowUtc >= EndUtc;

    /// <summary>
    /// Plain-English label for the AI prompt (weekly "Jun 8 - Jun 14", monthly "June 2026").
    /// Mobile builds its own localized labels from the period bounds.
    /// </summary>
    public string ToDisplayLabel() => PeriodType switch
    {
        ReviewPeriodType.Weekly =>
            $"{StartLocalDate.ToString("MMM d", CultureInfo.InvariantCulture)} - " +
            $"{EndLocalDateExclusive.AddDays(-1).ToString("MMM d", CultureInfo.InvariantCulture)}",
        ReviewPeriodType.Monthly =>
            StartLocalDate.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
        _ => StartLocalDate.ToString("o", CultureInfo.InvariantCulture),
    };

    private static DateOnly SnapToMonday(DateOnly date)
    {
        var daysSinceMonday = ((int)date.DayOfWeek + 6) % 7; // Sun=6, Mon=0, ... Sat=5
        return date.AddDays(-daysSinceMonday);
    }

    private static DateTimeOffset ToUtc(DateOnly localDate, TimeZoneInfo timeZone)
    {
        var localMidnight = localDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        return new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(localMidnight, timeZone), TimeSpan.Zero);
    }
}
