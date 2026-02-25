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

        Console.WriteLine($"🔔 Chinese result count: {zh.Count}");
        foreach (var item in zh)
            Console.WriteLine(
                $"🔔 [ZH] Text={item.Text}, Type={item.TypeName}, Start={item.Start}, End={item.End}, Resolution={JsonSerializer.Serialize(item.Resolution)}");

        Console.WriteLine($"🔔 English result count: {en.Count}");
        foreach (var item in en)
            Console.WriteLine(
                $"🔔 [EN] Text={item.Text}, Type={item.TypeName}, Start={item.Start}, End={item.End}, Resolution={JsonSerializer.Serialize(item.Resolution)}");
        var replacedMessage = ReplaceRecognizedDateTimes(message, [.. zh, .. en]);
        Console.WriteLine($"🔔 Replaced message: {replacedMessage}");
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
        if (resolution is not IDictionary<string, object> dict) return null;
        if (!dict.TryGetValue("values", out var valuesObj) || valuesObj is null) return null;

        var values = TryGetValues(valuesObj);
        if (values == null || values.Count == 0) return null;

        var preferred = values.Count >= 2 ? values[1] : values[0];

        if (preferred.TryGetValue("value", out var v) && !string.IsNullOrWhiteSpace(v))
            return v;

        if (preferred.TryGetValue("start", out var s) &&
            preferred.TryGetValue("end", out var e) &&
            !string.IsNullOrWhiteSpace(s) &&
            !string.IsNullOrWhiteSpace(e))
            return $"{s} to {e}";

        return null;
    }

    private static List<Dictionary<string, string>>? TryGetValues(object valuesObj)
    {
        if (valuesObj is List<Dictionary<string, string>> list1)
        {
            Console.WriteLine("is List<Dictionary<string, string>>");
            return list1;
        }

        if (valuesObj is IEnumerable<Dictionary<string, string>> enum1)
        {
            Console.WriteLine("is IEnumerable<Dictionary<string, string>>");
            return enum1.ToList();
        }

        if (valuesObj is IEnumerable<object> objList)
        {
            Console.WriteLine("is IEnumerable<object>");
            var list = new List<Dictionary<string, string>>();
            foreach (var item in objList)
            {
                if (item is Dictionary<string, string> dss)
                {
                    list.Add(dss);
                    continue;
                }

                if (item is IDictionary<string, object> dso)
                {
                    var converted = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    foreach (var kv in dso)
                        converted[kv.Key] = kv.Value?.ToString() ?? string.Empty;

                    list.Add(converted);
                }
            }

            return list.Count > 0 ? list : null;
        }

        return null;
    }
}