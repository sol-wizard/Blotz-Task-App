using BlotzTask.Modules.AiCoach.Domain.Policy;
using System.Globalization;
using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.AiCoach.Ai.Tools;

/// <summary>Turn-local draft workspace. A failed turn never commits a partial tool operation.</summary>
public sealed class DraftTools(IEnumerable<ProposalSet> drafts, string timeZoneId)
{
    public const string ContractVersion = "draft-tools-7";

    private readonly List<ProposalSet> _drafts = drafts.Select(draft => draft.Copy()).ToList();
    public IReadOnlyList<ProposalSet> Drafts => _drafts;

    public static IReadOnlyList<GatewayToolDefinition> Definitions { get; } =
    [
        new("create_draft", "Create one unsaved app draft containing the requested task items. Use immediately when the user requests task creation or accepts a task-draft invitation; do not ask for confirmation again. Otherwise obtain draft consent under the mode rules. Do not call for acceptance of chat advice, plans or checklists; deliver that content in chat instead. Inherit dates and constraints from the conversation; resolve relative dates using current local time. Supply reasonable tentative dates, start times and end times for missing scheduling details. Leave timing blank only when the user explicitly requests it. A recurring draft must contain exactly one item.",
            """{"type":"object","properties":{"items":{"type":"array","items":{"$ref":"#/$defs/item"},"minItems":1},"successReply":{"type":"string","minLength":1,"maxLength":280,"description":"Prewritten reply shown only on success. Briefly describe this draft operation using its arguments and known draft state. Mark default times tentative and adjustable. If timing was explicitly left blank, explain completion is needed before saving or starting. Distinguish task item count from draft count. Do not claim tasks are saved or availability is verified."}},"required":["items","successReply"],"additionalProperties":false,"$defs":{"recurrence":{"type":"object","properties":{"frequency":{"type":"string","enum":["Daily","Weekly","Monthly","Yearly"]},"interval":{"type":"integer","minimum":1},"daysOfWeek":{"type":["integer","null"],"description":"For Weekly, combine weekday flags: Monday=1, Tuesday=2, Wednesday=4, Thursday=8, Friday=16, Saturday=32, Sunday=64."},"dayOfMonth":{"type":["integer","null"]},"endDate":{"type":["string","null"]}},"required":["frequency","interval"],"additionalProperties":false},"item":{"type":"object","properties":{"title":{"type":"string"},"description":{"type":["string","null"]},"date":{"type":["string","null"],"description":"yyyy-MM-dd. Inherit the conversation date, resolving today/tomorrow in local time; otherwise choose a tentative date. Null only if the user requests no date. For recurrence, this is the start date."},"startTime":{"type":["string","null"],"description":"HH:mm in the session time zone. Use the requested start or a reasonable tentative default; null only if the user asks to leave time undecided."},"endTime":{"type":["string","null"],"description":"HH:mm later than startTime on the same local date. Use the requested duration or a reasonable tentative default; null only if the user asks to leave time undecided."},"recurrence":{"anyOf":[{"$ref":"#/$defs/recurrence"},{"type":"null"}]}},"required":["title","date","startTime","endTime"],"additionalProperties":false}}}"""),
        new("update_draft", "Atomically add, update or remove unsaved items in one draft. Use draft and item IDs from context or tool results. Omitted fields stay unchanged; null clears an optional field. Removing all items discards the draft. Saved items cannot be changed. A recurring draft must contain exactly one item.",
            """{"type":"object","properties":{"draftId":{"type":"string"},"changes":{"type":"array","minItems":1,"items":{"type":"object","properties":{"operation":{"type":"string","enum":["add","update","remove"]},"itemId":{"type":"string"},"fields":{"type":"object","properties":{"title":{"type":"string"},"description":{"type":["string","null"]},"date":{"type":["string","null"],"description":"yyyy-MM-dd; recurrence start date when recurrence is set"},"startTime":{"type":["string","null"],"description":"HH:mm in the session time zone"},"endTime":{"type":["string","null"],"description":"HH:mm on the same date in the session time zone"},"recurrence":{"anyOf":[{"$ref":"#/$defs/recurrence"},{"type":"null"}]}},"additionalProperties":false}},"required":["operation"],"additionalProperties":false}},"successReply":{"type":"string","minLength":1,"maxLength":280,"description":"Prewritten reply shown only on success. Briefly describe this draft operation using its arguments and known draft state. Mark default times tentative and adjustable. If timing was explicitly left blank, explain completion is needed before saving or starting. Distinguish task item count from draft count. Do not claim tasks are saved or availability is verified."}},"required":["draftId","changes","successReply"],"additionalProperties":false,"$defs":{"recurrence":{"type":"object","properties":{"frequency":{"type":"string","enum":["Daily","Weekly","Monthly","Yearly"]},"interval":{"type":"integer","minimum":1},"daysOfWeek":{"type":["integer","null"],"description":"For Weekly, combine weekday flags: Monday=1, Tuesday=2, Wednesday=4, Thursday=8, Friday=16, Saturday=32, Sunday=64."},"dayOfMonth":{"type":["integer","null"]},"endDate":{"type":["string","null"]}},"required":["frequency","interval"],"additionalProperties":false}}}"""),
        new("discard_draft", "Discard a pending draft. This does not delete any task already saved from it.",
            """{"type":"object","properties":{"draftId":{"type":"string"},"successReply":{"type":"string","minLength":1,"maxLength":280,"description":"Brief reply to show only if the draft is discarded. Do not claim a saved task was deleted."}},"required":["draftId","successReply"],"additionalProperties":false}"""),
    ];

    public string Execute(ModelToolCallRequest call)
    {
        try
        {
            using var document = JsonDocument.Parse(call.ArgumentsJson);
            var args = document.RootElement;
            ProposalSet draft;
            switch (call.Name)
            {
                case "create_draft":
                    CheckFields(args, "items", "successReply");
                    var items = Array(args, "items").Select(item => ReadItem(item, null)).ToArray();
                    if (items.Length == 0) throw new ArgumentException("A draft needs at least one item.");
                    CheckDraftShape(items);
                    draft = new ProposalSet { Id = Guid.NewGuid() };
                    draft.Replace(items);
                    _drafts.Add(draft);
                    break;
                case "update_draft":
                    CheckFields(args, "draftId", "changes", "successReply");
                    draft = Find(args);
                    var changes = Array(args, "changes");
                    if (changes.Length == 0) throw new ArgumentException("Provide at least one change.");
                    var updated = draft.Proposals.ToList();
                    foreach (var change in changes)
                    {
                        CheckFields(change, "operation", "itemId", "fields");
                        var operation = change.GetProperty("operation").GetString();
                        if (operation == "add")
                        {
                            updated.Add(ReadItem(change.GetProperty("fields"), null));
                            continue;
                        }
                        var itemId = change.GetProperty("itemId").GetGuid();
                        var index = updated.FindIndex(item => item.ProposalId == itemId);
                        if (index < 0) throw new ArgumentException("Item does not belong to this draft.");
                        if (!OperationPolicy.CanEditItem(updated[index]))
                            throw new ArgumentException("Already saved items cannot be changed or removed.");
                        if (operation == "remove") updated.RemoveAt(index);
                        else if (operation == "update") updated[index] = ReadItem(change.GetProperty("fields"), updated[index]);
                        else throw new ArgumentException("Unknown operation.");
                    }
                    if (updated.Count == 0) draft.Discard();
                    else { CheckDraftShape(updated); draft.Replace(updated); }
                    break;
                case "discard_draft":
                    CheckFields(args, "draftId", "successReply");
                    draft = Find(args);
                    draft.Discard();
                    break;
                default:
                    throw new ArgumentException("Unknown tool.");
            }
            return JsonSerializer.Serialize(new { success = true, draft = View(draft) });
        }
        catch (Exception ex) when (ex is JsonException or ArgumentException or InvalidOperationException or KeyNotFoundException or FormatException)
        {
            return JsonSerializer.Serialize(new { success = false, error = ex.Message });
        }
    }

    public static object View(ProposalSet draft) => new
    {
        draftId = draft.Id,
        status = draft.Status.ToString().ToLowerInvariant(),
        items = draft.Proposals.Select(item => new
        {
            itemId = item.ProposalId, title = item.Title, description = item.Description,
            date = item.Date?.ToString("yyyy-MM-dd"), startTime = item.StartTime?.ToString("HH:mm"),
            endTime = item.EndTime?.ToString("HH:mm"), savedTaskId = item.PersistedTaskId,
            recurrence = item.Recurrence is { } recurrence ? new {
                frequency = recurrence.Frequency.ToString(), interval = recurrence.Interval,
                daysOfWeek = recurrence.DaysOfWeek, dayOfMonth = recurrence.DayOfMonth,
                endDate = recurrence.EndDate?.ToString("yyyy-MM-dd") } : null,
        }),
    };

    private ProposalSet Find(JsonElement args)
    {
        var id = args.GetProperty("draftId").GetGuid();
        var draft = _drafts.SingleOrDefault(value => value.Id == id)
            ?? throw new ArgumentException("Draft does not belong to this conversation.");
        if (OperationPolicy.DraftOperationError(draft) is { } error) throw new ArgumentException(error);
        return draft;
    }

    private TaskProposal ReadItem(JsonElement fields, TaskProposal? original)
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
            timeZoneId, original?.LabelId, original?.PersistedTaskId, recurrence);
    }

    private static RecurrenceProposal? ReadRecurrence(JsonElement value)
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

    internal static void CheckDraftShape(IReadOnlyList<TaskProposal> items)
    {
        if (items.Any(item => item.Recurrence is not null) && items.Count != 1)
            throw new ArgumentException("A recurring task must be the only item in its draft.");
    }

    private static string? String(JsonElement fields, string name, string? fallback) =>
        fields.TryGetProperty(name, out var value) ? value.GetString() : fallback;
    private static DateOnly? ParseDate(string? value) => value is null ? null :
        DateOnly.ParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture);
    private static TimeOnly? ParseTime(string? value) => value is null ? null :
        TimeOnly.ParseExact(value, "HH:mm", CultureInfo.InvariantCulture);
    private static JsonElement[] Array(JsonElement args, string name) => args.GetProperty(name).EnumerateArray().ToArray();
    private static void CheckFields(JsonElement args, params string[] allowed)
    {
        foreach (var field in args.EnumerateObject())
            if (!allowed.Contains(field.Name, StringComparer.Ordinal))
                throw new ArgumentException($"Unknown field: {field.Name}.");
    }
}
