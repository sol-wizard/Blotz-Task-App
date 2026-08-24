using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Domain.Artifacts;
using BlotzTask.Modules.AiCoach.Domain.Capabilities;

namespace BlotzTask.Modules.AiCoach.Ai.Tools;

/// <summary>
/// Projects model-invokable capabilities into gateway tool definitions (tech design §21.12).
/// The JSON schema is generated from the same contract the dispatcher deserializes into
/// (<see cref="CreateTaskDraftsInput"/>), so tool schema and runtime validation cannot drift.
/// </summary>
public static class CapabilityToolProjector
{
    public const string DraftToolName = "create_task_drafts";

    public const string DraftToolDescription =
        "Propose the task draft card for the user to confirm. Pass EVERY concrete task the user " +
        "asked for in ONE call (one task = one entry in `tasks`; usually one, several when the user " +
        "named several things). Each task needs a specific date, start time and end time - either " +
        "given by the user or explicitly recommended by you in your reply. The card is a candidate " +
        "the user edits and confirms - it is not a saved task. Never call this for goals or vague " +
        "plans, and never call it twice in one turn.";

    private static readonly string DraftParametersSchema = JsonSerializer.Serialize(new
    {
        type = "object",
        additionalProperties = false,
        properties = new
        {
            tasks = new
            {
                type = "array",
                minItems = 1,
                maxItems = TaskDraftPayload.MaxItems,
                description = "All tasks for this card, in the order the user mentioned them.",
                items = new
                {
                    type = "object",
                    additionalProperties = false,
                    properties = new
                    {
                        title = new
                        {
                            type = "string",
                            description = "Short actionable task title in the user's language, e.g. '整理三篇参考资料'.",
                        },
                        description = new
                        {
                            type = "string",
                            description = "Optional one-line extra detail. Omit when the title says it all.",
                        },
                        date = new
                        {
                            type = "string",
                            description = "Task date as yyyy-MM-dd in the user's local time zone.",
                        },
                        startTime = new
                        {
                            type = "string",
                            description = "Start time as 24-hour HH:mm in the user's local time zone.",
                        },
                        endTime = new
                        {
                            type = "string",
                            description = "End time as 24-hour HH:mm, after startTime on the same day.",
                        },
                        labelId = new
                        {
                            type = "integer",
                            description = "Optional Blotz label id. Omit unless the user referenced a known label.",
                        },
                    },
                    required = new[] { "title", "date", "startTime", "endTime" },
                },
            },
        },
        required = new[] { "tasks" },
    });

    public static IReadOnlyList<GatewayToolDefinition> Project(IReadOnlyList<CapabilityDefinition> toolset)
    {
        return toolset
            .Select(definition => definition.ToolName switch
            {
                DraftToolName => new GatewayToolDefinition(
                    definition.ToolName, definition.ToolDescription, DraftParametersSchema),
                _ => throw new InvalidOperationException(
                    $"No schema projection for tool '{definition.ToolName}'."),
            })
            .ToList();
    }
}
