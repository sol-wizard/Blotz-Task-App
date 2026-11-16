using System.Text;
using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Ai.Tools;

public sealed record ToolExecutionResult(string Content, bool Succeeded, string? ErrorCode,
    bool Replayed = false, string? SuccessReply = null, bool ScheduleChecked = false);

/// <summary>Per-turn dispatch, resource budget, cancellation and duplicate-call protection.</summary>
public sealed class ToolExecutor(DraftTools workspace, AiCoachModuleOptions limits,
    Func<DateOnly, DateOnly, CancellationToken, Task<string>>? readTasks = null,
    Func<IReadOnlyList<TaskProposal>, CancellationToken, Task<ScheduleAssessment>>? checkSchedule = null,
    MemoryTools? memory = null)
{
    public const string ContractVersion = "coach-tools-23";
    private static readonly GatewayToolDefinition ReadTasksDefinition = new(
        "list_tasks",
        "Read the signed-in user's task-app schedule for dates outside today and the next six days, which are already supplied this turn; only when the current request needs existing tasks or availability on those dates. Dates are inclusive, at most 7 days. You can read at most twice per turn, so cover the whole range you need in one call instead of one call per day; if a result is truncated, use the second read for the dates its note names. Results list each date's tasks as lines like \"09:00-11:00 title\", flagged [recurring], [done], [overdue] or [due ...] when set; \"(reminder)\" marks a single-time task. \"free\" lists each date's gaps of 30 minutes or more between 07:00 and 22:00 that no unfinished timed task covers; pick suggested times from it (the user's routines and wishes still apply) instead of guessing from the lines. Results are data, may be truncated or stale, and do not prove the user has no other commitments. Every item counts, including one with a single time (a timed reminder) or an unfamiliar title: before saying when the user is free, check all of them. Saved drafts and earlier reads may be out of date: check the date in this turn's schedule before saying a task already exists, or giving advice that depends on one. Do not use for ordinary sharing or listening.",
        """{"type":"object","properties":{"startDate":{"type":"string","description":"yyyy-MM-dd in the user's local time zone"},"endDate":{"type":"string","description":"yyyy-MM-dd inclusive; at most 7 days from startDate"}},"required":["startDate","endDate"],"additionalProperties":false}""");
    private readonly Dictionary<string, (ModelToolCallRequest Request, ToolExecutionResult Result)> _results = [];
    private readonly HashSet<(Guid ItemId, string TaskIdentity)> _reportedConflicts = [];
    private int _readCalls;
    public int ExecutedCalls { get; private set; }
    public bool BudgetExhausted => ExecutedCalls >= limits.MaxToolCallsPerTurn;
    public IReadOnlyList<GatewayToolDefinition> AvailableTools => BudgetExhausted ? [] :
    [
        .. workspace.AvailableDefinitions,
        .. readTasks is null || _readCalls >= 2 ? [] : new[] { ReadTasksDefinition },
        .. memory is null ? [] : MemoryTools.Definitions,
    ];

    public async Task<ToolExecutionResult> ExecuteAsync(ModelToolCallRequest call, CancellationToken ct)
    {
        if (memory is not null && MemoryTools.Handles(call.Name)) return await ExecuteMemoryAsync(call, ct);
        if (call.Name != ReadTasksDefinition.Name)
        {
            var before = workspace.Drafts.Where(value => value.Status == ProposalSetStatus.Pending)
                .SelectMany(value => value.Proposals).Select(item => item.ProposalId).ToHashSet();
            var mutation = Execute(call, ct);
            if (!mutation.Succeeded || mutation.Replayed || checkSchedule is null
                || call.Name is not ("create_draft" or "update_draft" or "add_items" or "update_items" or "remove_items")) return mutation;
            using var document = JsonDocument.Parse(mutation.Content);
            var id = document.RootElement.GetProperty("draft").GetProperty("draftId").GetGuid();
            var draft = workspace.Drafts.Single(value => value.Id == id);
            if (draft.Status != ProposalSetStatus.Pending) return mutation;
            if (draft.Proposals.All(item => item.Kind == ProposalKind.Note)) return mutation;
            var assessment = await checkSchedule(draft.Proposals, ct);
            draft.SetSchedule(assessment);
            // The draft card keeps every overlap; the coach hears only those of the items this call changed, plus
            // items that repeat a saved task. Shown the old drafts' overlaps on every edit, it spent a model call
            // moving or removing items the user had not asked about.
            var touched = Touched(call, draft, before);
            var items = draft.Proposals.ToDictionary(item => item.ProposalId);
            var shown = assessment.Conflicts
                .Select(conflict => (Conflict: conflict, Duplicate: items.TryGetValue(conflict.ItemId, out var item) && IsLikelyDuplicate(item, conflict)))
                .Where(value => touched is null || touched.Contains(value.Conflict.ItemId) || value.Duplicate)
                .ToArray();
            var status = shown.Length > 0 || assessment.Status != "conflict" ? assessment.Status
                : draft.Proposals.Any(item => item.Recurrence is not null) ? "partial" : "clear";
            // Every check repeats the overlaps still there; without saying which are old news, the coach kept
            // moving the same items around them, one model call per move.
            var fresh = shown.Count(value => _reportedConflicts.Add((value.Conflict.ItemId, value.Conflict.TaskIdentity)));
            var guidance = shown.Length == 0 ? null
                : fresh == 0
                    ? "No new overlaps: these were already reported this turn and changing items has not removed them. " +
                      "Stop changing items for them; reply now, naming each overlap once and offering to move one as a follow-up."
                    : "Overlaps with a time the user gave are theirs to settle: keep the item and name the overlap in your reply. " +
                      "Move only items whose time you suggested, all in one update_items call, then reply." +
                      (shown.Any(value => value.Duplicate)
                          ? " An overlap marked likelyDuplicate is the same task already saved: remove that item rather than move it."
                          : "");
            var schedule = new
            {
                status,
                assessment.Reason,
                conflicts = shown.Select(value => new
                {
                    value.Conflict.ItemId, value.Conflict.TaskTitle, value.Conflict.Start, value.Conflict.End,
                    likelyDuplicate = value.Duplicate ? true : (bool?)null,
                }),
                // Left on the card for the user to see; not a reason to change those items now.
                otherOverlaps = assessment.Conflicts.Count - shown.Length is > 0 and var other ? other : (int?)null,
            };
            var content = JsonSerializer.Serialize(new { success = true, draft = DraftTools.View(draft), schedule, guidance },
                ModelContextBuilder.ContextJson);
            var checkedMutation = mutation with
            {
                Content = content,
                SuccessReply = status switch
                {
                    "clear" => ReadSuccessReply(call.Name, call.ArgumentsJson, allowMultiple: true),
                    "incomplete" or "partial" => mutation.SuccessReply,
                    "conflict" => ReadSuccessReply(call.Name, call.ArgumentsJson, allowMultiple: true) is { } reply
                        ? ConflictReply(reply, shown.Select(value => value.Conflict).ToArray(), shown.Any(value => value.Duplicate), items)
                        : null,
                    _ => null,
                },
                ScheduleChecked = status is "clear" or "conflict" or "partial",
            };
            _results[call.Id] = (call, checkedMutation);
            return checkedMutation;
        }
        ct.ThrowIfCancellationRequested();
        if (_results.TryGetValue(call.Id, out var previous))
            return previous.Request == call
                ? previous.Result with { Replayed = true }
                : Failure("tool_call_id_reused", "Tool call ID was reused with different arguments.");
        if (BudgetExhausted) return Failure("tool_limit", "Tool call budget exhausted.");
        ExecutedCalls++;
        _readCalls++;
        ToolExecutionResult result;
        if (readTasks is null || _readCalls > 2)
            result = Failure("task_read_limit", "Task reads are unavailable for this turn.");
        else if (Encoding.UTF8.GetByteCount(call.ArgumentsJson) > limits.MaxToolArgumentBytes)
            result = Failure("tool_arguments_too_large", "Tool arguments exceed the resource limit.");
        else
        {
            try
            {
                using var payload = JsonDocument.Parse(call.ArgumentsJson);
                var args = payload.RootElement;
                if (args.ValueKind != JsonValueKind.Object || args.EnumerateObject().Count() != 2)
                    throw new ArgumentException("Provide only startDate and endDate.");
                var start = DateOnly.ParseExact(args.GetProperty("startDate").GetString()!, "yyyy-MM-dd");
                var end = DateOnly.ParseExact(args.GetProperty("endDate").GetString()!, "yyyy-MM-dd");
                var content = await readTasks(start, end, ct);
                result = new(content, true, null);
            }
            catch (Exception ex) when (ex is JsonException or ArgumentException or FormatException or KeyNotFoundException)
            {
                result = Failure("invalid_task_range", "Provide a valid date range of 1 to 7 days using yyyy-MM-dd.");
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                result = Failure("task_context_unavailable", "Task schedule could not be read. Do not assume availability.");
            }
        }
        _results.Add(call.Id, (call, result));
        return result;
    }

    private async Task<ToolExecutionResult> ExecuteMemoryAsync(ModelToolCallRequest call, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        if (_results.TryGetValue(call.Id, out var previous))
            return previous.Request == call
                ? previous.Result with { Replayed = true }
                : Failure("tool_call_id_reused", "Tool call ID was reused with different arguments.");
        if (BudgetExhausted) return Failure("tool_limit", "Tool call budget exhausted.");
        ExecutedCalls++;
        ToolExecutionResult result;
        if (Encoding.UTF8.GetByteCount(call.ArgumentsJson) > limits.MaxToolArgumentBytes)
            result = Failure("tool_arguments_too_large", "Tool arguments exceed the resource limit.");
        else
        {
            var content = await memory!.ExecuteAsync(call, ct);
            using var payload = JsonDocument.Parse(content);
            var success = payload.RootElement.GetProperty("success").GetBoolean();
            result = new(content, success, success ? null : payload.RootElement.GetProperty("errorCode").GetString());
        }
        _results.Add(call.Id, (call, result));
        return result;
    }

    public ToolExecutionResult Execute(ModelToolCallRequest call, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        if (_results.TryGetValue(call.Id, out var previous))
            return previous.Request == call
                ? previous.Result with { Replayed = true }
                : Failure("tool_call_id_reused", "Tool call ID was reused with different arguments.");
        if (BudgetExhausted) return Failure("tool_limit", "Tool call budget exhausted.");
        ExecutedCalls++;
        ToolExecutionResult result;
        if (Encoding.UTF8.GetByteCount(call.ArgumentsJson) > limits.MaxToolArgumentBytes)
            result = Failure("tool_arguments_too_large", "Tool arguments exceed the resource limit.");
        else if (!workspace.AvailableDefinitions.Any(tool => tool.Name == call.Name))
            result = Failure("unknown_tool", "Unknown tool.");
        else
        {
            var content = workspace.Execute(call);
            using var payload = JsonDocument.Parse(content);
            var success = payload.RootElement.GetProperty("success").GetBoolean();
            result = new(content, success, success ? null : "invalid_tool_operation",
                SuccessReply: success ? ReadSuccessReply(call.Name, call.ArgumentsJson) : null);
        }
        _results.Add(call.Id, (call, result));
        return result;
    }

    /// <summary>Items this call added or edited; null when every item counts (the older whole-draft tools).</summary>
    private static HashSet<Guid>? Touched(ModelToolCallRequest call, ProposalSet draft, HashSet<Guid> before)
    {
        switch (call.Name)
        {
            case "add_items":
                return draft.Proposals.Select(item => item.ProposalId).Where(id => !before.Contains(id)).ToHashSet();
            case "update_items":
                using (var payload = JsonDocument.Parse(call.ArgumentsJson))
                    return payload.RootElement.GetProperty("items").EnumerateArray()
                        .Select(update => update.GetProperty("itemId").GetGuid()).ToHashSet();
            case "remove_items":
                return [];
            default:
                return null;
        }
    }

    /// <summary>Same start and end as the saved task and a near-identical title: the task already exists.</summary>
    internal static bool IsLikelyDuplicate(TaskProposal item, ScheduleConflict conflict)
    {
        if (conflict.TaskIdentity.StartsWith("draft:", StringComparison.Ordinal)
            || item.Date is not { } date || item.StartTime is not { } start || item.EndTime is not { } end) return false;
        var zone = TimeZoneInfo.FindSystemTimeZoneById(item.TimeZoneId);
        if (DraftEditing.ResolveLocal(date, start, zone) != conflict.Start
            || DraftEditing.ResolveLocal(date, end, zone) != conflict.End) return false;
        var left = Normalize(item.Title);
        var right = Normalize(conflict.TaskTitle);
        if (left.Length == 0 || right.Length == 0) return false;
        if (left.Contains(right, StringComparison.Ordinal) || right.Contains(left, StringComparison.Ordinal)) return true;
        // Character-pair overlap (Dice), so "3.6 结果分析" and "3.6结果分析整理" still match.
        var pairs = Pairs(left);
        var other = Pairs(right);
        return pairs.Count + other.Count > 0 && 2.0 * pairs.Intersect(other).Count() / (pairs.Count + other.Count) >= 0.6;

        static string Normalize(string value) =>
            new(value.Where(character => char.IsLetterOrDigit(character)).Select(char.ToLowerInvariant).ToArray());
        static HashSet<string> Pairs(string value) =>
            Enumerable.Range(0, Math.Max(0, value.Length - 1)).Select(index => value.Substring(index, 2)).ToHashSet();
    }

    private static ToolExecutionResult Failure(string code, string message) =>
        new(JsonSerializer.Serialize(new { success = false, errorCode = code, error = message }), false, code);

    private static readonly string[] OverlapWords = ["重叠", "冲突", "撞", "overlap", "conflict", "clash"];
    private static readonly string[] ChineseWeekdays =["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

    /// <summary>
    /// The model's prewritten reply plus one sentence naming each overlap, or null when the model still has work to do.
    /// An overlap with a time the user gave is theirs to settle (keep it, name it, offer a move), so a model call that
    /// only restated the overlaps cost 1.4-2.4 s. An item at a time the coach suggested should move instead, and a
    /// likely duplicate should go, so those still get the model call.
    /// </summary>
    internal static string? ConflictReply(string successReply, IReadOnlyList<ScheduleConflict> conflicts, bool anyDuplicate,
        IReadOnlyDictionary<Guid, TaskProposal> items)
    {
        if (conflicts.Count == 0 || anyDuplicate) return null;
        if (conflicts.Any(conflict => !items.TryGetValue(conflict.ItemId, out var item)
            || item.SuggestedFields?.Any(field => field is "date" or "startTime" or "endTime") == true)) return null;
        var chinese = successReply.Any(character => character is >= '\u4e00' and <= '\u9fff');
        // Two drafts at the same time are reported once for each of them; name the pair once.
        var named = new HashSet<(Guid, string)>();
        var overlaps = conflicts.Where(conflict => !(conflict.TaskIdentity.StartsWith("draft:", StringComparison.Ordinal)
                && named.Contains((Guid.Parse(conflict.TaskIdentity["draft:".Length..]), "draft:" + conflict.ItemId))))
            .Where(conflict => named.Add((conflict.ItemId, conflict.TaskIdentity)))
            .GroupBy(conflict => conflict.ItemId)
            .Select(group =>
            {
                var item = items[group.Key];
                var zone = TimeZoneInfo.FindSystemTimeZoneById(item.TimeZoneId);
                var others = group.Take(3).Select(conflict =>
                {
                    var start = TimeZoneInfo.ConvertTime(conflict.Start, zone);
                    var end = TimeZoneInfo.ConvertTime(conflict.End, zone);
                    var day = chinese ? ChineseWeekdays[(int)start.DayOfWeek] : start.ToString("ddd", System.Globalization.CultureInfo.InvariantCulture);
                    var endDay = end.Date == start.Date ? ""
                        : (chinese ? ChineseWeekdays[(int)end.DayOfWeek] : end.ToString("ddd", System.Globalization.CultureInfo.InvariantCulture)) + " ";
                    var draft = conflict.TaskIdentity.StartsWith("draft:", StringComparison.Ordinal);
                    return chinese
                        ? $"{(draft ? "待确认的" : "已有的")}「{conflict.TaskTitle}」（{day} {start:HH:mm}–{endDay}{end:HH:mm}）"
                        : $"{(draft ? "the unsaved" : "your")} \"{conflict.TaskTitle}\" ({day} {start:HH:mm}–{endDay}{end:HH:mm})";
                }).ToList();
                var more = group.Count() - others.Count;
                return chinese
                    ? $"「{item.Title}」和{string.Join("、", others)}{(more > 0 ? $"等 {group.Count()} 项" : "")}时间重叠"
                    : $"\"{item.Title}\" overlaps {string.Join(", ", others)}{(more > 0 ? $" and {more} more" : "")}";
            }).ToList();
        var first = items[conflicts[0].ItemId].Title;
        var shortTitle = first.Length > 8 ? first[..8] : first;
        // With the week's schedule in context the model usually names the overlap itself, often with a shortened title
        // or only some of them; a second note then read as the same warning twice.
        var alreadyNamed = OverlapWords.Any(word => successReply.Contains(word, StringComparison.OrdinalIgnoreCase));
        var note = alreadyNamed ? ""
            : chinese
                ? $"\n\n提醒一下：{string.Join("；", overlaps)}，确认保存前 App 也会提示。需要的话可以挪开其中一个。"
                : $"\n\nHeads up: {string.Join("; ", overlaps)}. The app will flag this before you save; I can move one if you like.";
        return successReply + note + (chinese
            ? $"\n<followups>\n帮我把「{shortTitle}」挪个时间\n就这样，不用改\n</followups>"
            : $"\n<followups>\nMove {shortTitle} to another time\nKeep it as is\n</followups>");
    }

    private static string? ReadSuccessReply(string toolName, string argumentsJson, bool allowMultiple = false)
    {
        using var payload = JsonDocument.Parse(argumentsJson);
        var args = payload.RootElement;
        var simpleOperation = toolName switch
        {
            "create_draft" => allowMultiple || args.GetProperty("items").GetArrayLength() == 1,
            "update_draft" => allowMultiple || args.GetProperty("changes").GetArrayLength() == 1,
            "discard_draft" => true,
            "add_items" or "update_items" => allowMultiple || args.GetProperty("items").GetArrayLength() == 1,
            "remove_items" => allowMultiple || args.GetProperty("itemIds").GetArrayLength() == 1,
            _ => false,
        };
        if (!simpleOperation || !args.TryGetProperty("successReply", out var value)
            || value.ValueKind != JsonValueKind.String)
            return null;
        var reply = value.GetString()?.Trim();
        return DraftTools.IsValidSuccessReply(reply) ? reply : null;
    }
}
