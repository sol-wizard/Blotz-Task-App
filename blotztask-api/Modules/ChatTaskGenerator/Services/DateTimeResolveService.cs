using System.Text;
using Microsoft.Recognizers.Text;
using Microsoft.Recognizers.Text.DateTime;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public sealed class ResolveDateTimesRequest
{
    public string Message { get; init; } = string.Empty;
    public TimeZoneInfo TimeZone { get; init; }
}

public class DateTimeResolveService
{
    public string Resolve(ResolveDateTimesRequest request)
    {
        if (request == null) throw new ArgumentNullException(nameof(request));
        var message = request.Message;


        var localNow = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, request.TimeZone).DateTime;
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
                Value = ExtractResolvedTimeValue(r.Resolution)
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

    private static string? ExtractResolvedTimeValue(object? resolution)
    {
        if (resolution is not IDictionary<string, object> dict) return null;
        if (!dict.TryGetValue("values", out var valuesObj) || valuesObj is null) return null;

        if (valuesObj is not List<Dictionary<string, string>> values || values.Count == 0) return null;

        var selectedTime = values.Count >= 2 ? values[1] : values[0];

        if (selectedTime.TryGetValue("value", out var v) && !string.IsNullOrWhiteSpace(v))
            return v;

        if (selectedTime.TryGetValue("start", out var s) &&
            selectedTime.TryGetValue("end", out var e) &&
            !string.IsNullOrWhiteSpace(s) &&
            !string.IsNullOrWhiteSpace(e))
            return $"{s} to {e}";

        return null;
    }
}
