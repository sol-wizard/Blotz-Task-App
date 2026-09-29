namespace BlotzTask.Modules.Reviews.Domain;

public static class ReviewTimeZone
{
    /// <summary>
    /// Resolves the IANA timezone id used to snap the review period.
    /// Current behavior resolves a request timezone or falls back to UTC until users store a timezone.
    /// Target behavior is stored user timezone, then request fallback, then reject.
    /// </summary>
    // Preferring the stored user timezone over the request one is tracked in PBI #1473.
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
