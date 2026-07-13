using BlotzTask.Shared.Time;

namespace BlotzTask.Modules.Reviews.Domain;

public static class ReviewTimeZone
{
    // Resolves the IANA timezone id used to snap the review period.
    // Priority: stored user timezone -> request timeZoneId -> reject. Never falls back to UTC
    // (aligns with timezone-handling.md Rule 5).
    public static TimeZoneInfo Resolve(string? storedTimezone, string? requestTimeZoneId)
    {
        if (!string.IsNullOrWhiteSpace(storedTimezone))
            return TimeZoneClock.ResolveOrThrow(storedTimezone);

        if (!string.IsNullOrWhiteSpace(requestTimeZoneId))
            return TimeZoneClock.ResolveOrThrow(requestTimeZoneId);

        throw new ArgumentException(
            "No timezone available: the user has no stored timezone and none was provided in the request.");
    }
}
