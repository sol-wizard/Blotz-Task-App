namespace BlotzTask.Modules.Reviews.Domain;

public static class ReviewTimeZone
{
    /// <summary>
    /// Resolves the IANA timezone id used to snap the review period.
    /// Current behavior resolves a request timezone or falls back to UTC until users store a timezone.
    /// Target behavior is stored user timezone, then request fallback, then reject.
    /// </summary>
    // TIMEZONE TODO: Align with timezone-handling.md Rule 5.
    // Reviews/reports should prefer the stored user timezone, use request timeZoneId only
    // when the stored timezone is missing, and reject instead of silently using UTC when
    // neither timezone is available.
    public static TimeZoneInfo Resolve(string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
            return TimeZoneInfo.Utc;

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            throw new ArgumentException($"Unknown timeZoneId '{timeZoneId}'.");
        }
        catch (InvalidTimeZoneException)
        {
            throw new ArgumentException($"Invalid timeZoneId '{timeZoneId}'.");
        }
    }
}
