using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.UserUnderstanding.Commands;
using BlotzTask.Modules.UserUnderstanding.Domain;

namespace BlotzTask.Modules.AiCoach.Ai.Tools;

/// <summary>Writes the user asked for take effect immediately; they are not drafts awaiting confirmation.</summary>
public sealed class MemoryTools(RememberUserMemoryCommandHandler remember, ForgetUserMemoryCommandHandler forget,
    Guid userId, Guid sourceMessageId, string evidence, string timeZoneId)
{
    public static IReadOnlyList<GatewayToolDefinition> Definitions { get; } =
    [
        new("remember", "Save something about the user for future conversations. Use only when the user explicitly asks you to remember something, or gives a standing instruction about how you should help them from now on (for example \"always\", \"from now on\", \"以后\"). Do not save one-off states (tonight, today, this mood), your own suggestions, task drafts, or sensitive details about health, money or other people unless the user explicitly asks you to remember them. To correct an item already listed in the user context, pass its ref in replaces instead of adding a second item. After success, confirm in one short sentence. Do not mention settings: there is no list of remembered items to view or edit there.",
            """{"type":"object","properties":{"kind":{"type":"string","enum":["preference","goal","constraint","routine","fact"],"description":"preference: how the user wants help; goal: something they are working towards; constraint: a limit on what to plan; routine: a regular pattern; fact: other background"},"content":{"type":"string","minLength":1,"maxLength":100,"description":"One short statement in the user's language, written as a fact about them, e.g. 工作日晚上不安排运动"},"validUntil":{"type":["string","null"],"description":"yyyy-MM-dd, the last local date it applies. Null when it will still be true in three months; otherwise its end date, or 14 days from today when no end was given"},"replaces":{"type":["string","null"],"description":"Ref of the existing item this corrects, e.g. a1b2c3"}},"required":["kind","content","validUntil","replaces"],"additionalProperties":false}"""),
        new("forget", "Delete a remembered item when the user asks you to forget it or says it is no longer true. Use the ref shown in the user context or returned by remember. Ask which item they mean only if several could match. Confirm in one short sentence; do not mention settings or say it can be restored.",
            """{"type":"object","properties":{"ref":{"type":"string","description":"Ref of the item, e.g. a1b2c3"}},"required":["ref"],"additionalProperties":false}"""),
    ];

    public static bool Handles(string toolName) => toolName is "remember" or "forget";

    public async Task<string> ExecuteAsync(ModelToolCallRequest call, CancellationToken ct)
    {
        try
        {
            using var document = JsonDocument.Parse(call.ArgumentsJson);
            var args = document.RootElement;
            return call.Name switch
            {
                "remember" => await RememberAsync(args, ct),
                "forget" => await ForgetAsync(args, ct),
                _ => Failure("unknown_tool", "Unknown tool."),
            };
        }
        catch (Exception ex) when (ex is JsonException or KeyNotFoundException or InvalidOperationException
                                       or FormatException or ArgumentException)
        {
            return Failure("invalid_arguments", "Provide the documented arguments.");
        }
    }

    private async Task<string> RememberAsync(JsonElement args, CancellationToken ct)
    {
        var kind = Enum.Parse<UserMemoryKind>(args.GetProperty("kind").GetString()!, ignoreCase: true);
        DateTimeOffset? validUntil = null;
        if (args.TryGetProperty("validUntil", out var until) && until.ValueKind == JsonValueKind.String)
        {
            validUntil = UserMemory.EndOfLocalDay(DateOnly.ParseExact(until.GetString()!, "yyyy-MM-dd"), timeZoneId);
        }
        var result = await remember.Handle(new RememberUserMemoryCommand
        {
            UserId = userId,
            Kind = kind,
            Content = args.GetProperty("content").GetString()!,
            ValidUntil = validUntil,
            ReplacesRef = args.TryGetProperty("replaces", out var replaces) && replaces.ValueKind == JsonValueKind.String
                ? replaces.GetString() : null,
            SourceMessageId = sourceMessageId,
            Evidence = evidence,
        }, ct);
        if (!result.Success) return Failure(result.ErrorCode!, result.ErrorCode switch
        {
            "memory_full" => "The memory list is full. Ask the user which remembered item to remove first.",
            "memory_disabled" => "The user has switched AI memory off in settings. Do not claim it was remembered.",
            "unknown_memory_ref" => "No single remembered item has that ref.",
            "invalid_valid_until" => "validUntil must be a future date.",
            _ => "Content must be 1 to 100 characters.",
        });
        var memory = result.Memory!;
        return JsonSerializer.Serialize(new
        {
            success = true,
            alreadyKnown = result.AlreadyKnown,
            memory = new { @ref = memory.Ref, kind = memory.Kind.ToString().ToLowerInvariant(), content = memory.Content,
                validUntil = memory.ValidUntil },
        });
    }

    private async Task<string> ForgetAsync(JsonElement args, CancellationToken ct)
    {
        var deleted = await forget.Handle(new ForgetUserMemoryCommand { UserId = userId, Ref = args.GetProperty("ref").GetString() }, ct);
        return deleted
            ? JsonSerializer.Serialize(new { success = true })
            : Failure("unknown_memory_ref", "No single remembered item has that ref.");
    }

    private static string Failure(string code, string message) =>
        JsonSerializer.Serialize(new { success = false, errorCode = code, error = message });
}
