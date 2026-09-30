using System.Text;
using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Ai.Tools;

public sealed record ToolExecutionResult(string Content, bool Succeeded, string? ErrorCode,
    bool Replayed = false, string? SuccessReply = null, bool ScheduleChecked = false);

/// <summary>Per-turn dispatch, resource budget, cancellation and duplicate-call protection.</summary>
public sealed class ToolExecutor(DraftTools workspace, AiCoachModuleOptions limits,
    Func<DateOnly, DateOnly, CancellationToken, Task<string>>? readTasks = null,
    Func<IReadOnlyList<TaskProposal>, CancellationToken, Task<ScheduleAssessment>>? checkSchedule = null)
{
    public const string ContractVersion = "coach-tools-9";
    private static readonly GatewayToolDefinition ReadTasksDefinition = new(
        "list_tasks",
        "Read the signed-in user's task-app schedule only when the current request needs existing tasks or availability. Dates are inclusive, at most 7 days. Results are data, may be truncated or stale, and do not prove the user has no other commitments. Do not use for ordinary sharing or listening.",
        """{"type":"object","properties":{"startDate":{"type":"string","description":"yyyy-MM-dd in the user's local time zone"},"endDate":{"type":"string","description":"yyyy-MM-dd inclusive; at most 7 days from startDate"}},"required":["startDate","endDate"],"additionalProperties":false}""");
    private readonly Dictionary<string, (ModelToolCallRequest Request, ToolExecutionResult Result)> _results = [];
    private int _readCalls;
    public int ExecutedCalls { get; private set; }
    public bool BudgetExhausted => ExecutedCalls >= limits.MaxToolCallsPerTurn;
    public IReadOnlyList<GatewayToolDefinition> AvailableTools => BudgetExhausted ? [] :
        readTasks is null || _readCalls >= 2 ? DraftTools.Definitions : [.. DraftTools.Definitions, ReadTasksDefinition];

    public async Task<ToolExecutionResult> ExecuteAsync(ModelToolCallRequest call, CancellationToken ct)
    {
        if (call.Name != ReadTasksDefinition.Name)
        {
            var mutation = Execute(call, ct);
            if (!mutation.Succeeded || mutation.Replayed || checkSchedule is null
                || call.Name is not ("create_draft" or "update_draft")) return mutation;
            using var document = JsonDocument.Parse(mutation.Content);
            var id = document.RootElement.GetProperty("draft").GetProperty("draftId").GetGuid();
            var draft = workspace.Drafts.Single(value => value.Id == id);
            if (draft.Status != ProposalSetStatus.Pending) return mutation;
            var assessment = await checkSchedule(draft.Proposals, ct);
            draft.SetSchedule(assessment);
            var content = JsonSerializer.Serialize(new { success = true, draft = DraftTools.View(draft), schedule = assessment });
            var checkedMutation = mutation with
            {
                Content = content,
                SuccessReply = assessment.Status switch
                {
                    "clear" => ReadSuccessReply(call.Name, call.ArgumentsJson, allowMultiple: true),
                    "incomplete" or "partial" => mutation.SuccessReply,
                    _ => null,
                },
                ScheduleChecked = assessment.Status is "clear" or "conflict" or "partial",
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
        else if (!DraftTools.Definitions.Any(tool => tool.Name == call.Name))
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

    private static ToolExecutionResult Failure(string code, string message) =>
        new(JsonSerializer.Serialize(new { success = false, errorCode = code, error = message }), false, code);

    private static string? ReadSuccessReply(string toolName, string argumentsJson, bool allowMultiple = false)
    {
        using var payload = JsonDocument.Parse(argumentsJson);
        var args = payload.RootElement;
        var simpleOperation = toolName switch
        {
            "create_draft" => allowMultiple || args.GetProperty("items").GetArrayLength() == 1,
            "update_draft" => allowMultiple || args.GetProperty("changes").GetArrayLength() == 1,
            "discard_draft" => true,
            _ => false,
        };
        if (!simpleOperation || !args.TryGetProperty("successReply", out var value)
            || value.ValueKind != JsonValueKind.String)
            return null;
        var reply = value.GetString()?.Trim();
        return string.IsNullOrWhiteSpace(reply) || reply.Length > 280 || reply.Any(char.IsControl)
            ? null : reply;
    }
}
