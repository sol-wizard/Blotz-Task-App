using System.Text;
using System.Text.Json;
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
        if (resolution is null) return null;

        try
        {
            using var document = JsonDocument.Parse(JsonSerializer.Serialize(resolution));
            if (!document.RootElement.TryGetProperty("values", out var values) ||
                values.ValueKind != JsonValueKind.Array ||
                values.GetArrayLength() == 0) return null;

            if (values.GetArrayLength() >= 2)
            {
                var second = values[1];
                if (second.TryGetProperty("value", out var secondValueElement))
                {
                    var secondValue = secondValueElement.GetString();
                    if (!string.IsNullOrWhiteSpace(secondValue)) return secondValue;
                }

                if (second.TryGetProperty("start", out var secondStartElement) &&
                    second.TryGetProperty("end", out var secondEndElement))
                {
                    var secondStart = secondStartElement.GetString();
                    var secondEnd = secondEndElement.GetString();
                    if (!string.IsNullOrWhiteSpace(secondStart) && !string.IsNullOrWhiteSpace(secondEnd))
                        return $"{secondStart} to {secondEnd}";
                }
            }

            var first = values[0];
            if (first.TryGetProperty("value", out var valueElement))
            {
                var value = valueElement.GetString();
                if (!string.IsNullOrWhiteSpace(value)) return value;
            }

            if (first.TryGetProperty("start", out var startElement) &&
                first.TryGetProperty("end", out var endElement))
            {
                var start = startElement.GetString();
                var end = endElement.GetString();
                if (!string.IsNullOrWhiteSpace(start) && !string.IsNullOrWhiteSpace(end))
                    return $"{start} to {end}";
            }
        }
        catch
        {
            return null;
        }

        return null;
    }
}