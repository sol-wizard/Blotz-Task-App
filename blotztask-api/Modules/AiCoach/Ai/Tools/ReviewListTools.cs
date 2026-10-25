using System.Text.Json;
using System.Text.Json.Nodes;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Ai.Tools;

/// <summary>Mutates only the turn-local workspace; formal writes require app confirmation.</summary>
internal sealed class ReviewListTools(List<ProposalSet> drafts, string timeZoneId)
{
    public static IReadOnlyList<GatewayToolDefinition> Definitions { get; } = BuildDefinitions();

    private static IReadOnlyList<GatewayToolDefinition> BuildDefinitions()
    {
        var legacy = JsonNode.Parse(DraftTools.Definitions[0].ParametersJsonSchema)!.AsObject();
        var definitions = legacy["$defs"]!.DeepClone().AsObject();
        var item = definitions["item"]!.AsObject();
        item["properties"]!["kind"] = JsonNode.Parse("""{"type":"string","enum":["task","note"]}""");
        item["properties"]!["suggestedFields"] = JsonNode.Parse("""{"type":"array","uniqueItems":true,"items":{"type":"string","enum":["date","startTime","endTime"]},"description":"Only task date/time fields supplied as AI suggestions. Preserve unchanged flags on updates."}""");
        item["required"] = JsonNode.Parse("""["kind","title"]""");
        var reply = legacy["properties"]!["successReply"]!.DeepClone();
        reply["description"] = "Success reply, often the entire reply, rendered as Markdown. Write in the user's register, like a friend helping out (in Chinese, spoken Mandarin), not a system notice. If the user's message carried feeling, open with a few words responding to it. If they changed their mind or voiced a worry, say in a few words whether their reasoning holds and why. For one task, one or two sentences that include its time range. For two or more tasks, use the schedule format from the instructions: one opening sentence, a ### heading, one bullet per task in time order with the bold time range first. Mention notes by count only. Say that items await their confirmation in the list, not saved; mention suggested times when applicable.";
        var updateFields = item.DeepClone();
        updateFields.AsObject().Remove("required");
        updateFields["properties"]!.AsObject().Remove("kind");
        return
        [
            Definition("add_items", "Append tasks and notes to the current unsaved review list. Capture notes ONLY when the user explicitly asks to record information, including a clear reference to prior content. Ordinary questions, background statements, emotions and unadopted assistant advice are not note requests. Tasks need scheduling suggestions unless the user explicitly leaves timing undecided. Notes have title/description only: omit all task fields. Reuse existing item IDs with update_items rather than duplicating items.",
                JsonNode.Parse("""{"items":{"type":"array","minItems":1,"maxItems":100,"items":{"$ref":"#/$defs/item"}}}""")!.AsObject(), ["items"]),
            Definition("update_items", "Edit unsaved review items by itemId. Each entry has itemId and fields. Omitted fields stay unchanged; null clears optional fields. Kind cannot change. Existing task time zones are retained. Supply the complete suggestedFields array if changing suggestion provenance.",
                new JsonObject { ["items"] = new JsonObject
                {
                    ["type"] = "array", ["minItems"] = 1, ["maxItems"] = 100,
                    ["items"] = new JsonObject
                    {
                        ["type"] = "object", ["additionalProperties"] = false,
                        ["required"] = new JsonArray("itemId", "fields"),
                        ["properties"] = new JsonObject
                        {
                            ["itemId"] = new JsonObject { ["type"] = "string" },
                            ["fields"] = updateFields,
                        },
                    },
                } }, ["items"]),
            Definition("remove_items", "Remove unsaved items by itemIds from the current review list. This never deletes saved tasks or notes.",
                JsonNode.Parse("""{"itemIds":{"type":"array","minItems":1,"maxItems":100,"uniqueItems":true,"items":{"type":"string"}}}""")!.AsObject(), ["itemIds"]),
        ];

        GatewayToolDefinition Definition(string name, string description, JsonObject properties, string[] required)
        {
            properties["successReply"] = reply.DeepClone();
            var schema = new JsonObject
            {
                ["type"] = "object", ["additionalProperties"] = false,
                ["properties"] = properties,
                ["required"] = new JsonArray(required.Append("successReply").Select(value => (JsonNode?)JsonValue.Create(value)).ToArray()),
                ["$defs"] = definitions.DeepClone(),
            };
            return new(name, description, schema.ToJsonString());
        }
    }

    public string Execute(ModelToolCallRequest call)
    {
        try
        {
            using var document = JsonDocument.Parse(call.ArgumentsJson);
            var args = document.RootElement;
            CheckFields(args, call.Name == "remove_items" ? ["itemIds", "successReply"] : ["items", "successReply"]);
            var reply = args.GetProperty("successReply").GetString();
            if (!DraftTools.IsValidSuccessReply(reply))
                throw new ArgumentException($"Provide a successReply of at most {DraftTools.SuccessReplyMaxLength} characters without control characters other than line breaks.");
            var pending = drafts.Where(draft => draft.Status == ProposalSetStatus.Pending).ToArray();
            // Consolidate older task cards only after the complete operation has validated.
            var proposals = pending.SelectMany(draft => draft.Proposals).Where(item => !item.IsSaved).ToList();
            switch (call.Name)
            {
                case "add_items":
                    foreach (var item in Array(args, "items")) proposals.Add(ReadItem(item, null));
                    break;
                case "update_items":
                    var updates = Array(args, "items");
                    var updatedIds = new HashSet<Guid>();
                    foreach (var update in updates)
                    {
                        CheckFields(update, "itemId", "fields");
                        var id = update.GetProperty("itemId").GetGuid();
                        if (!updatedIds.Add(id)) throw new ArgumentException("Duplicate item IDs.");
                        var index = proposals.FindIndex(item => item.ProposalId == id);
                        if (index < 0) throw new ArgumentException("Unknown unsaved review item.");
                        proposals[index] = ReadItem(update.GetProperty("fields"), proposals[index]);
                    }
                    break;
                case "remove_items":
                    var ids = Array(args, "itemIds").Select(value => value.GetGuid()).ToArray();
                    if (ids.Distinct().Count() != ids.Length || ids.Any(id => proposals.All(item => item.ProposalId != id)))
                        throw new ArgumentException("Unknown or duplicate unsaved review item.");
                    proposals.RemoveAll(item => ids.Contains(item.ProposalId));
                    break;
                default: throw new ArgumentException("Unknown review tool.");
            }
            if (proposals.Count > 100) throw new ArgumentException("The review list can contain at most 100 items.");
            var current = pending.SingleOrDefault(draft => draft.IsReviewList);
            var draft = current ?? new ProposalSet { Id = Guid.NewGuid(), IsReviewList = true };
            draft.Replace(proposals);
            if (proposals.Count == 0) draft.Discard();
            foreach (var old in pending.Where(value => value.Id != draft.Id)) old.Discard();
            if (current is null) drafts.Add(draft);
            return JsonSerializer.Serialize(new { success = true, draft = DraftTools.View(draft) });
        }
        catch (Exception ex) when (ex is JsonException or ArgumentException or InvalidOperationException or KeyNotFoundException or FormatException)
        {
            return JsonSerializer.Serialize(new { success = false, error = ex.Message });
        }
    }

    private TaskProposal ReadItem(JsonElement fields, TaskProposal? original)
    {
        CheckFields(fields, original is null
            ? ["kind", "title", "description", "date", "startTime", "endTime", "recurrence", "suggestedFields"]
            : ["title", "description", "date", "startTime", "endTime", "recurrence", "suggestedFields"]);
        var kind = original?.Kind ?? (fields.GetProperty("kind").GetString() switch
        {
            "task" => ProposalKind.Task,
            "note" => ProposalKind.Note,
            _ => throw new ArgumentException("kind must be task or note."),
        });
        TaskProposal item;
        if (kind == ProposalKind.Note)
        {
            CheckFields(fields, original is null ? ["kind", "title", "description"] : ["title", "description"]);
            item = new(original?.ProposalId ?? Guid.NewGuid(), ReadString("title", original?.Title) ?? "",
                ReadString("description", original?.Description), null, null, null, timeZoneId, null, Kind: ProposalKind.Note);
        }
        else
        {
            var taskFields = JsonNode.Parse(fields.GetRawText())!.AsObject();
            taskFields.Remove("kind");
            taskFields.Remove("suggestedFields");
            using var taskDocument = JsonDocument.Parse(taskFields.ToJsonString());
            item = new DraftTools([], timeZoneId).ReadItem(taskDocument.RootElement, original);
            var suggested = fields.TryGetProperty("suggestedFields", out var flags)
                ? flags.EnumerateArray().Select(value => value.GetString() ?? "").Distinct().ToArray()
                : original?.SuggestedFields ?? [];
            item = item with { SuggestedFields = suggested };
        }
        item.Validate();
        return item;

        string? ReadString(string name, string? fallback) => fields.TryGetProperty(name, out var value) ? value.GetString() : fallback;
    }

    private static JsonElement[] Array(JsonElement args, string name)
    {
        var items = args.GetProperty(name).EnumerateArray().ToArray();
        if (items.Length is < 1 or > 100) throw new ArgumentException("Provide between 1 and 100 items.");
        return items;
    }

    private static void CheckFields(JsonElement value, params string[] allowed)
    {
        foreach (var field in value.EnumerateObject())
            if (!allowed.Contains(field.Name, StringComparer.Ordinal)) throw new ArgumentException($"Unknown field: {field.Name}.");
    }
}
