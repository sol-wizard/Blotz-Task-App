using System.Globalization;

namespace BlotzTask.Modules.Tasks.Shared;

public class TimeSpanHelper
{
    /// <summary>
    /// Parses a duration string into TimeSpan.
    /// Accepts formats like "hh:mm:ss" or "d.hh:mm:ss".
    /// Returns null if input is null, empty, or invalid.
    /// </summary>
    public static TimeSpan? ParseDuration(string duration)
    {
        if (string.IsNullOrWhiteSpace(duration))
            return null;

        // Accept standard TimeSpan formats
        if (TimeSpan.TryParseExact(
                duration,
                new[] { "c", @"d\.hh\:mm\:ss", @"hh\:mm\:ss" },
                CultureInfo.InvariantCulture,
                out var result))
        {
            return result;
        }

        return null; // invalid format
    }

    /// <summary>
    /// Formats a TimeSpan? into "hh:mm:ss" string.
    /// Returns empty string if null.
    /// </summary>
    public static string FormatDuration(TimeSpan? duration)
    {
        if (!duration.HasValue)
            return string.Empty;

        var ts = duration.Value;

        // Calculate total hours including days
        int totalHours = (int)ts.TotalHours;
        return string.Format("{0:D2}:{1:D2}:{2:D2}", totalHours, ts.Minutes, ts.Seconds);
    }
}