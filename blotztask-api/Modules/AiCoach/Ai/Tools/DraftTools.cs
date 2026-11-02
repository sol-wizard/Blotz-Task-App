using System.Globalization;
using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.AiCoach.Ai.Tools;

/// <summary>Turn-local draft workspace. A failed turn never commits a partial tool operation.</summary>
public sealed class DraftTools(IEnumerable<ProposalSet> drafts, string timeZoneId)
{
    public const int SuccessReplyMaxLength = 600;

    private readonly List<ProposalSet> _drafts = drafts.Select(draft => draft.Copy()).ToList();
    public IReadOnlyList<ProposalSet> Drafts => _drafts;
    public IReadOnlyList<GatewayToolDefinition> AvailableDefinitions => ReviewListTools.Definitions;

    // Line breaks are allowed so a multi-task reply can carry a Markdown schedule.
    public static bool IsValidSuccessReply(string? reply) =>
        !string.IsNullOrWhiteSpace(reply) && reply.Length <= SuccessReplyMaxLength
        && !reply.Any(c => char.IsControl(c) && c != '\n');

    public string Execute(ModelToolCallRequest call) => new ReviewListTools(_drafts, timeZoneId).Execute(call);

    public static object View(ProposalSet draft) => new
    {
        draftId = draft.Id,
        status = draft.Status.ToString().ToLowerInvariant(),
        items = draft.Proposals.Select(item => new
        {
            itemId = item.ProposalId, kind = item.Kind.ToString().ToLowerInvariant(), title = item.Title, description = item.Description,
            date = item.Date?.ToString("yyyy-MM-dd"), startTime = item.StartTime?.ToString("HH:mm"),
            endTime = item.EndTime?.ToString("HH:mm"), timeZoneId = item.TimeZoneId, savedTaskId = item.PersistedTaskId,
            savedNoteId = item.PersistedNoteId, suggestedFields = item.SuggestedFields ?? [],
            recurrence = item.Recurrence is { } recurrence ? new {
                frequency = recurrence.Frequency.ToString(), interval = recurrence.Interval,
                daysOfWeek = recurrence.DaysOfWeek, dayOfMonth = recurrence.DayOfMonth,
                endDate = recurrence.EndDate?.ToString("yyyy-MM-dd") } : null,
        }),
    };

    internal TaskProposal ReadItem(JsonElement fields, TaskProposal? original)
    {
        CheckFields(fields, "title", "description", "date", "startTime", "endTime", "recurrence");
        var title = String(fields, "title", original?.Title)?.Trim();
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("Title is required.");
        var date = ParseDate(String(fields, "date", original?.Date?.ToString("yyyy-MM-dd")));
        var start = ParseTime(String(fields, "startTime", original?.StartTime?.ToString("HH:mm")));
        var end = ParseTime(String(fields, "endTime", original?.EndTime?.ToString("HH:mm")));
        if (start.HasValue && end.HasValue && end <= start)
            throw new ArgumentException("End time must be after start time on the same date.");
        var recurrence = fields.TryGetProperty("recurrence", out var recurrenceField)
            ? ReadRecurrence(recurrenceField) : original?.Recurrence;
        ValidateRecurrence(recurrence, date);
        return new(original?.ProposalId ?? Guid.NewGuid(), title,
            String(fields, "description", original?.Description), date, start, end,
            original?.TimeZoneId ?? timeZoneId, original?.LabelId, original?.PersistedTaskId, recurrence);
    }

    internal static RecurrenceProposal? ReadRecurrence(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Null) return null;
        CheckFields(value, "frequency", "interval", "daysOfWeek", "dayOfMonth", "endDate");
        if (!Enum.TryParse<RecurrenceFrequency>(value.GetProperty("frequency").GetString(), false, out var frequency)
            || !Enum.IsDefined(frequency)) throw new ArgumentException("Invalid recurrence frequency.");
        int? OptionalInt(string name) => value.TryGetProperty(name, out var field) && field.ValueKind != JsonValueKind.Null
            ? field.GetInt32() : null;
        return new(frequency, value.GetProperty("interval").GetInt32(), OptionalInt("daysOfWeek"),
            OptionalInt("dayOfMonth"), ParseDate(String(value, "endDate", null)));
    }

    internal static void ValidateRecurrence(RecurrenceProposal? recurrence, DateOnly? date)
    {
        if (recurrence is null) return;
        if (recurrence.Interval < 1 || recurrence.EndDate < date)
            throw new ArgumentException("Invalid recurrence interval or end date.");
        if (recurrence.Frequency == RecurrenceFrequency.Weekly)
        {
            if (recurrence.DaysOfWeek is null or < 1 or > 127 || recurrence.DayOfMonth is not null)
                throw new ArgumentException("Weekly recurrence needs weekday flags only.");
        }
        else if (recurrence.DaysOfWeek is not null ||
                 (recurrence.Frequency != RecurrenceFrequency.Monthly && recurrence.DayOfMonth is not null) ||
                 recurrence.DayOfMonth is < 1 or > 31)
            throw new ArgumentException("Invalid recurrence fields for frequency.");
    }

    private static string? String(JsonElement fields, string name, string? fallback) =>
        fields.TryGetProperty(name, out var value) ? value.GetString() : fallback;
    private static DateOnly? ParseDate(string? value) => value is null ? null :
        DateOnly.ParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture);
    private static TimeOnly? ParseTime(string? value) => value is null ? null :
        TimeOnly.ParseExact(value, "HH:mm", CultureInfo.InvariantCulture);
    private static void CheckFields(JsonElement args, params string[] allowed)
    {
        foreach (var field in args.EnumerateObject())
            if (!allowed.Contains(field.Name, StringComparer.Ordinal))
                throw new ArgumentException($"Unknown field: {field.Name}.");
    }
}
