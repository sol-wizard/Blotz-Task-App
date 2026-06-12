namespace BlotzTask.Modules.Reviews.Domain;

public static class ReviewTimeZone
{
    /// <summary>
    /// Resolves the IANA timezone id used to snap the review period.
    /// Fallback: request id -> UTC. A missing id is fine (UTC); an invalid id is a 400.
    /// </summary>
    // TODO: per the stored-timezone PBI, insert the user's saved TimeZoneId between the
    // request id and the UTC fallback once UserPreference stores one.
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
