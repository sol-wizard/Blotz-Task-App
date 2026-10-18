using System.Text;

namespace BlotzTask.Modules.AiCoach.Ai.Runtime;

/// <summary>
/// The model may end a reply with a &lt;followups&gt; block of one-tap next messages. The block is
/// never shown or persisted as reply text; a malformed block yields no follow-ups rather than leaking.
/// </summary>
public static class FollowUps
{
    internal const string Marker = "<followups";
    private const string CloseTag = "</followups>";
    public const int MaxCount = 3;
    public const int MaxLength = 60;

    public static (string Reply, IReadOnlyList<string> FollowUps) Extract(string text)
    {
        var start = text.IndexOf(Marker, StringComparison.OrdinalIgnoreCase);
        if (start < 0) return (text, []);
        var reply = text[..start].TrimEnd();
        var openEnd = text.IndexOf('>', start);
        if (openEnd < 0) return (reply, []);
        var body = text[(openEnd + 1)..];
        var close = body.IndexOf(CloseTag, StringComparison.OrdinalIgnoreCase);
        if (close >= 0) body = body[..close];
        var items = body.Split('\n')
            .Select(line => line.Trim().TrimStart('-', '*', '•').Trim())
            .Select(line => line.Length > 2 && char.IsDigit(line[0]) && line[1] is '.' or ')' ? line[2..].Trim() : line)
            .Where(line => line.Length is > 0 and <= MaxLength && !line.Contains('<'))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(MaxCount)
            .ToArray();
        return (reply, items);
    }
}

/// <summary>Forwards streamed reply text but withholds the follow-up block, including a split marker.</summary>
public sealed class FollowUpStreamFilter(Func<string, Task> emit)
{
    private readonly StringBuilder pending = new();
    private bool hidden;

    public async Task WriteAsync(string delta)
    {
        if (hidden) return;
        pending.Append(delta);
        var text = pending.ToString();
        var index = text.IndexOf(FollowUps.Marker, StringComparison.OrdinalIgnoreCase);
        if (index >= 0)
        {
            hidden = true;
            pending.Clear();
            if (index > 0) await emit(text[..index]);
            return;
        }
        var keep = PartialMarkerLength(text);
        pending.Clear().Append(text, text.Length - keep, keep);
        if (text.Length > keep) await emit(text[..^keep]);
    }

    /// <summary>Release a held-back tail that turned out not to be a marker.</summary>
    public async Task FlushAsync()
    {
        if (hidden || pending.Length == 0) return;
        var text = pending.ToString();
        pending.Clear();
        await emit(text);
    }

    private static int PartialMarkerLength(string text)
    {
        for (var length = Math.Min(FollowUps.Marker.Length - 1, text.Length); length > 0; length--)
            if (FollowUps.Marker.StartsWith(text[^length..], StringComparison.OrdinalIgnoreCase))
                return length;
        return 0;
    }
}
