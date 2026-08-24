using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Domain.Capabilities;
using BlotzTask.Modules.AiCoach.Domain.Modes;

namespace BlotzTask.Modules.AiCoach.Ai.ModelTurn;

public sealed record CapabilityExecutionResult(
    bool Accepted,
    bool IsCorrectableSchemaError,
    string ToolResultJson);

public interface ICapabilityDispatcher
{
    CapabilityExecutionResult Dispatch(
        ModelToolCallRequest toolCall,
        int invocationIndex,
        TurnExecutionContext turn,
        AiCoachModeDefinition mode);
}

/// <summary>
/// Runs one model tool call through: registry resolve -> mandatory capability guard ->
/// strongly-typed deserialization + schema/business validation -> handler (tech design §21.10,
/// steps 11-13). Tool results never claim persistence, never leak internals, and guard
/// rejections cannot be bypassed by retrying (§21.16).
/// </summary>
public sealed class CapabilityDispatcher(
    CapabilityRegistry registry,
    ICapabilityGuard guard,
    CreateTaskDraftsHandler draftHandler,
    ILogger<CapabilityDispatcher> logger) : ICapabilityDispatcher
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public CapabilityExecutionResult Dispatch(
        ModelToolCallRequest toolCall,
        int invocationIndex,
        TurnExecutionContext turn,
        AiCoachModeDefinition mode)
    {
        var definition = registry.FindByToolName(toolCall.Name);
        if (definition is null)
        {
            return Record(turn, invocationIndex, toolCall.Name, CapabilityRejectionCode.CapabilityNotRegistered,
                Rejected("unknown_capability", "This tool does not exist. Do not call it again; reply to the user instead."));
        }

        var request = new CapabilityRequest(
            definition.Id,
            definition.CapabilityVersion,
            CapabilityInvoker.Model,
            turn.BaseSnapshot.UserId,
            ProposedArtifactInTurn: turn.ProposedDraft is not null,
            ProcessedInvocationIds: [],
            InvocationId: Guid.NewGuid());

        var decision = guard.Evaluate(request, turn.BaseSnapshot, mode);
        if (!decision.IsAllowed)
        {
            logger.LogInformation(
                "Capability {CapabilityId} rejected by guard: {Code} (conversation {ConversationId})",
                definition.Id, decision.RejectionCode, turn.BaseSnapshot.ConversationId);

            var modelMessage = decision.RejectionCode switch
            {
                CapabilityRejectionCode.PendingDraftAlreadyExists or
                    CapabilityRejectionCode.ArtifactAlreadyProposedInCurrentTurn =>
                    "A draft already exists and the user has not handled it yet. Do not create another draft. Reply to the user instead, working with the existing card.",
                _ => "This action is not allowed right now. Reply to the user without using tools.",
            };

            return Record(turn, invocationIndex, toolCall.Name, decision.RejectionCode,
                Rejected(decision.RejectionCode.ToString(), modelMessage));
        }

        CreateTaskDraftsInput? input;
        try
        {
            input = JsonSerializer.Deserialize<CreateTaskDraftsInput>(toolCall.ArgumentsJson, JsonOptions);
        }
        catch (JsonException)
        {
            input = null;
        }

        if (input is null)
        {
            return Record(turn, invocationIndex, toolCall.Name, CapabilityRejectionCode.SchemaValidationFailed,
                Rejected("SchemaValidationFailed", "The tool arguments were not valid JSON for this tool."),
                isCorrectable: true);
        }

        var (payload, error) = draftHandler.Validate(input, turn.TimeZoneId);
        if (error is not null)
        {
            // MissingRequiredInformation is NOT correctable by re-calling the tool — the model
            // must go back to the user with one question (§19.1). Format errors may be corrected
            // once (§21.11 rule 5).
            var correctable = error.Code == CapabilityRejectionCode.SchemaValidationFailed;
            return Record(turn, invocationIndex, toolCall.Name, error.Code,
                Rejected(error.Code.ToString(), error.SafeMessageForModel), correctable);
        }

        turn.SetProposedDraft(payload!);

        var resultJson = JsonSerializer.Serialize(new
        {
            status = "proposed",
            taskCount = payload!.Items.Count,
            note = payload.IsSingle
                ? "Draft candidate recorded. It is NOT saved - the user will see an editable card and must confirm it. Now give your final short reply stating the recommended time and its reason."
                : $"Draft card with {payload.Items.Count} tasks recorded. It is NOT saved - the user will see one editable card listing them and must confirm it. Now give your final short reply: summarize the arrangement in one or two sentences (mention the recommended times briefly) and invite the user to adjust or confirm on the card.",
        });

        return Record(turn, invocationIndex, toolCall.Name, CapabilityRejectionCode.None,
            new CapabilityExecutionResult(true, false, resultJson));
    }

    private static CapabilityExecutionResult Rejected(string code, string message) =>
        new(false, false, JsonSerializer.Serialize(new { status = "rejected", code, message }));

    private static CapabilityExecutionResult Record(
        TurnExecutionContext turn,
        int invocationIndex,
        string toolName,
        CapabilityRejectionCode code,
        CapabilityExecutionResult result,
        bool isCorrectable = false)
    {
        turn.RecordExecution(new CapabilityExecutionRecord(invocationIndex, toolName, result.Accepted, code));
        return isCorrectable ? result with { IsCorrectableSchemaError = true } : result;
    }
}
