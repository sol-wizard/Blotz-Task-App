using System.Text;
using Microsoft.Recognizers.Text;
using Microsoft.Recognizers.Text.DateTime;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public sealed class ResolveDateTimesRequest
{
    public string Message { get; init; } = string.Empty;
    public TimeZoneInfo TimeZone { get; init; }

    /// <summary>
    /// Optional fixed reference point for "now". When set, the recognizer uses this
    /// instead of capturing a fresh <see cref="DateTimeOffset.UtcNow"/>, ensuring the
    /// quality-check runner and the resolver share the same time snapshot.
    /// </summary>
    public DateTime? ReferenceTime { get; init; }
}

public class DateTimeResolveService
{
    // Timex suffixes the recognizer uses for a vague part of day: morning, afternoon, evening, night.
    private static readonly string[] PartOfDayTimexSuffixes = ["TMO", "TAF", "TEV", "TNI"];

    public string Resolve(ResolveDateTimesRequest request)
    {
        if (request == null) throw new ArgumentNullException(nameof(request));
        var message = request.Message;


        var localNow = request.ReferenceTime
            ?? TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, request.TimeZone).DateTime;
        localNow = DateTime.SpecifyKind(localNow, DateTimeKind.Unspecified);

        // Run recognizer for Chinese and English, then merge results
        var zh = DateTimeRecognizer.RecognizeDateTime(message, Culture.Chinese, refTime: localNow);
        var en = DateTimeRecognizer.RecognizeDateTime(message, Culture.English, refTime: localNow);

        var replacedMessage = ReplaceRecognizedDateTimes(message, [.. zh, .. en]);

        return replacedMessage;
    }

    private static string ReplaceRecognizedDateTimes(string message, IReadOnlyCollection<ModelResult> results)
    {
        if (string.IsNullOrWhiteSpace(message) || results.Count == 0) return message;

        // start/end are the inclusive character indexes of the recognized time phrase in the original message; we use them to replace that exact substring with the resolved absolute value.
        var replacements = results
            .Select(r => new
            {
                r.Start,
                r.End,
                Value = ExtractResolvedTimeValue(r.Resolution, r.Text)
            })
            .Where(r => !string.IsNullOrWhiteSpace(r.Value))
            .Where(r => r.Start >= 0 && r.End >= r.Start && r.End < message.Length)
            .GroupBy(r => (r.Start, r.End))
            .Select(g => g.First())
            .OrderByDescending(r => r.Start)
            .ToList();


        var newMessage = new StringBuilder(message);
        foreach (var r in replacements)
        {
            newMessage.Remove(r.Start, r.End - r.Start + 1);
            newMessage.Insert(r.Start, r.Value);
        }

        return newMessage.ToString();
    }

    private static string? ExtractResolvedTimeValue(object? resolution, string originalText)
    {
        if (resolution is not IDictionary<string, object> dict) return null;
        if (!dict.TryGetValue("values", out var valuesObj) || valuesObj is null) return null;

    
        if (valuesObj is not List<Dictionary<string, string>> values || values.Count != 1) return null;

        var selectedTime = values[0];

        // Recurring ("set", e.g. "every Monday") and "duration" phrases have no single absolute
        // value — the recognizer yields the literal "not resolved" for sets. Leave the original
        // text untouched so recurrence intent survives for the AI to extract, instead of splicing
        // "not resolved" into the message. One-off relative dates (type "date"/"datetime") still resolve.
        if (selectedTime.TryGetValue("type", out var type) && type is "duration" or "set")
            return null;

        // A vague part of day ("明晚", "今天下午", "tomorrow morning") resolves to a fixed window —
        // evening is 16:00–20:00 — and the model always took the window's start, so "tonight" landed
        // at 16:00 (a third of all "晚上" tasks in PostHog). Pin the date, keep the user's wording,
        // and let the model choose the hour. A bare part of day carries no date, so leave it alone.
        if (type is "datetimerange" or "timerange"
            && selectedTime.TryGetValue("timex", out var timex)
            && PartOfDayTimexSuffixes.Any(timex.EndsWith))
        {
            if (type == "timerange") return null;

            return selectedTime.TryGetValue("start", out var rangeStart) && rangeStart.Length >= 10
                ? $"{originalText} ({rangeStart[..10]})"
                : null;
        }

        if (selectedTime.TryGetValue("value", out var v)
            && !string.IsNullOrWhiteSpace(v)
            && !string.Equals(v, "not resolved", StringComparison.OrdinalIgnoreCase))
            return v;

        if (selectedTime.TryGetValue("start", out var s) &&
            selectedTime.TryGetValue("end", out var e) &&
            !string.IsNullOrWhiteSpace(s) &&
            !string.IsNullOrWhiteSpace(e))
            return $"{s} to {e}";

        return null;
    }
}
