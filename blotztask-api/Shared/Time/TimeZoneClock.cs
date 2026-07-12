namespace BlotzTask.Shared.Time;

public static class TimeZoneClock
{
    // Returns the user's local "today" — avoids using server date, which can be a different calendar day.
    public static DateOnly Today(TimeZoneInfo timeZone)
    {
        var userNow = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, timeZone);
        return DateOnly.FromDateTime(userNow.DateTime);
    }

    // Converts a local calendar date's midnight to UTC so DB range queries use the correct day boundary.
    // e.g. StartOfDayUtc(2026-06-22, "Australia/Sydney" UTC+10) → 2026-06-21 14:00:00 +00:00
    public static DateTimeOffset StartOfDayUtc(DateOnly localDate, TimeZoneInfo timeZone)
    {
        var localMidnight = localDate.ToDateTime(TimeOnly.MinValue);
        return new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(localMidnight, timeZone));
    }

    // Re-throws with a cleaner message so callers get an ArgumentException instead of a raw TimeZoneNotFoundException.
    public static TimeZoneInfo ResolveOrThrow(string timeZoneId)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            throw new ArgumentException($"Unknown or unsupported timezone: '{timeZoneId}'", nameof(timeZoneId));
        }
    }
}
