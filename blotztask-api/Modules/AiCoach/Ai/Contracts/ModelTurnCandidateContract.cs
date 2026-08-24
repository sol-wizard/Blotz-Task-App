using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Ai.Contracts;

/// <summary>
/// The model-facing JSON contract for one turn (v3 tech design §10) and its parser — the Model
/// Output Schema Guard. The JSON schema handed to the model as a structured-output response
/// format and the runtime validation both derive from this single file, so they cannot drift.
///
/// The strategy enum deliberately exposes only the strategies a v1 model turn may candidate
/// (no update/supersede/close): what is not in the output contract can never be proposed.
/// </summary>
public static class ModelTurnCandidateContract
{
    public const int SchemaVersion = 1;

    public const string ResponseFormatName = "model_turn_candidate";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    /// <summary>The structured-output JSON schema (strict: every field required, no extras).</summary>
    public static readonly string JsonSchema = JsonSerializer.Serialize(new
    {
        type = "object",
        additionalProperties = false,
        required = new[] { "signals", "strategy", "response", "proposalSet" },
        properties = new
        {
            signals = new
            {
                type = "object",
                additionalProperties = false,
                required = new[] { "intent", "userExpressedActionIntent", "actionIntentQuote", "userRejectedAction" },
                properties = new
                {
                    intent = new
                    {
                        type = "string",
                        @enum = new[] { "small_talk", "goal", "concrete_action", "question", "emotional", "unknown" },
                        description = "What the CURRENT user message mainly is.",
                    },
                    userExpressedActionIntent = new
                    {
                        type = "boolean",
                        description = "True ONLY when the current message names concrete doable thing(s) or "
                                      + "explicitly hands the planning decision to you (\"帮我安排\", \"you decide\", "
                                      + "\"list what I need to do\"). Never true for moods, wishes or pure goals.",
                    },
                    actionIntentQuote = new
                    {
                        type = new[] { "string", "null" },
                        description = "EXACT substring of the current user message proving the action intent. "
                                      + "Required when userExpressedActionIntent is true; null otherwise.",
                    },
                    userRejectedAction = new
                    {
                        type = "boolean",
                        description = "True when the current message declines or cancels acting.",
                    },
                },
            },
            strategy = new
            {
                type = "string",
                @enum = new[]
                {
                    "continue_listening", "ask_gentle_question", "ask_clarifying_question",
                    "ask_user_to_choose_goal", "show_proposal_set", "discuss_existing_proposal",
                },
                description = "Your chosen conversation strategy for this turn. It must be one the "
                              + "current turn allows (see the turn frame).",
            },
            response = new
            {
                type = "object",
                additionalProperties = false,
                required = new[] { "type", "text", "question" },
                properties = new
                {
                    type = new
                    {
                        type = "string",
                        @enum = new[]
                        {
                            "listening", "gentle_question", "clarifying_question",
                            "goal_choice", "proposal_introduction",
                        },
                        description = "Must match the strategy: continue_listening/discuss_existing_proposal -> "
                                      + "listening; ask_gentle_question -> gentle_question; ask_clarifying_question -> "
                                      + "clarifying_question; ask_user_to_choose_goal -> goal_choice; "
                                      + "show_proposal_set -> proposal_introduction.",
                    },
                    text = new
                    {
                        type = "string",
                        description = "The COMPLETE reply shown to the user, in the user's language. "
                                      + "One or two short sentences; warm, direct, zero filler.",
                    },
                    question = new
                    {
                        type = new[] { "string", "null" },
                        description = "For question types only: the single question you are asking "
                                      + "(also contained in text). Null for other types.",
                    },
                },
            },
            proposalSet = new
            {
                type = new[] { "object", "null" },
                additionalProperties = false,
                required = new[] { "proposals" },
                description = "ONLY when strategy is show_proposal_set: every concrete task for the card. "
                              + "Null otherwise. The card is a candidate the user edits and confirms — "
                              + "it is NOT a saved task.",
                properties = new
                {
                    proposals = new
                    {
                        type = "array",
                        minItems = 1,
                        maxItems = ProposalSet.MaxProposals,
                        items = new
                        {
                            type = "object",
                            additionalProperties = false,
                            required = new[]
                            {
                                "clientProposalKey", "title", "description",
                                "date", "startTime", "endTime", "labelId",
                            },
                            properties = new
                            {
                                clientProposalKey = new
                                {
                                    type = "string",
                                    description = "Your stable key for this proposal within the turn, e.g. \"p1\".",
                                },
                                title = new
                                {
                                    type = "string",
                                    description = "Short actionable task title in the user's language.",
                                },
                                description = new
                                {
                                    type = new[] { "string", "null" },
                                    description = "Optional one-line extra detail. Null when the title says it all.",
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
                                    type = new[] { "integer", "null" },
                                    description = "Blotz label id if the user referenced a known label; null otherwise.",
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    /// <summary>
    /// Parses and structurally validates the raw model output. A failure here is a
    /// schema-correction case (v3 §21: at most one correction attempt), reported back to the
    /// model verbatim via <see cref="ParseResult.Error"/>.
    /// </summary>
    public static ParseResult Parse(string? rawJson)
    {
        if (string.IsNullOrWhiteSpace(rawJson))
            return ParseResult.Failed("Empty model output.");

        CandidateJson? dto;
        try
        {
            dto = JsonSerializer.Deserialize<CandidateJson>(rawJson, JsonOptions);
        }
        catch (JsonException ex)
        {
            return ParseResult.Failed($"Output is not valid JSON for the required schema: {ex.Message}");
        }

        if (dto?.Signals is null || dto.Response is null)
            return ParseResult.Failed("signals and response are required.");

        var strategy = ConversationStrategyExtensions.FromWireValue(dto.Strategy ?? "");
        if (strategy is null)
            return ParseResult.Failed($"Unknown strategy '{dto.Strategy}'.");

        if (string.IsNullOrWhiteSpace(dto.Response.Text))
            return ParseResult.Failed("response.text must not be empty.");

        var text = dto.Response.Text.Trim();
        var question = string.IsNullOrWhiteSpace(dto.Response.Question) ? null : dto.Response.Question.Trim();

        AssistantResponseCandidate? response = dto.Response.Type switch
        {
            "listening" => new ListeningResponse(text),
            "gentle_question" when question is not null => new GentleQuestionResponse(text, question),
            "clarifying_question" when question is not null => new ClarifyingQuestionResponse(text, question),
            "goal_choice" when question is not null => new GoalChoiceResponse(text, question),
            "proposal_introduction" => new ProposalIntroductionResponse(text),
            "gentle_question" or "clarifying_question" or "goal_choice" =>
                null, // question missing — reported below
            _ => null,
        };

        if (response is null)
        {
            return ParseResult.Failed(dto.Response.Type
                is "gentle_question" or "clarifying_question" or "goal_choice"
                ? $"response.question is required for response.type '{dto.Response.Type}'."
                : $"Unknown response.type '{dto.Response.Type}'.");
        }

        ProposalSetCandidate? proposalSet = null;
        if (dto.ProposalSet is { Proposals: not null })
        {
            var proposals = new List<TaskProposalCandidate>(dto.ProposalSet.Proposals.Count);
            for (var i = 0; i < dto.ProposalSet.Proposals.Count; i++)
            {
                var (proposal, error) = ParseProposal(dto.ProposalSet.Proposals[i], i);
                if (error is not null)
                    return ParseResult.Failed(error);
                proposals.Add(proposal!);
            }
            proposalSet = new ProposalSetCandidate(proposals);
        }

        var intent = dto.Signals.Intent switch
        {
            "small_talk" => IntentType.SmallTalk,
            "goal" => IntentType.Goal,
            "concrete_action" => IntentType.ConcreteAction,
            "question" => IntentType.Question,
            "emotional" => IntentType.Emotional,
            _ => IntentType.Unknown,
        };

        return ParseResult.Success(new ModelTurnCandidate(
            new InterpretationSignals(
                intent,
                dto.Signals.UserExpressedActionIntent,
                string.IsNullOrWhiteSpace(dto.Signals.ActionIntentQuote) ? null : dto.Signals.ActionIntentQuote,
                dto.Signals.UserRejectedAction),
            strategy.Value,
            response,
            proposalSet));
    }

    private static (TaskProposalCandidate? Proposal, string? Error) ParseProposal(ProposalJson item, int index)
    {
        var at = $"proposalSet.proposals[{index}]";

        if (string.IsNullOrWhiteSpace(item.Title))
            return (null, $"{at}.title is required.");

        if (!DateOnly.TryParseExact(item.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var date))
            return (null, $"{at}.date must use the format yyyy-MM-dd.");

        if (!TryParseTime(item.StartTime, out var startTime) || !TryParseTime(item.EndTime, out var endTime))
            return (null, $"{at}: startTime and endTime must use the 24-hour format HH:mm.");

        return (new TaskProposalCandidate(
            ClientProposalKey: string.IsNullOrWhiteSpace(item.ClientProposalKey) ? $"p{index + 1}" : item.ClientProposalKey,
            Title: item.Title.Trim(),
            Description: string.IsNullOrWhiteSpace(item.Description) ? null : item.Description.Trim(),
            Date: date,
            StartTime: startTime,
            EndTime: endTime,
            LabelId: item.LabelId), null);
    }

    private static bool TryParseTime(string? value, out TimeOnly time)
    {
        time = default;
        return value is not null
               && TimeOnly.TryParseExact(value, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out time);
    }

    public sealed record ParseResult(ModelTurnCandidate? Candidate, string? Error)
    {
        public bool IsSuccess => Candidate is not null;

        public static ParseResult Success(ModelTurnCandidate candidate) => new(candidate, null);

        public static ParseResult Failed(string error) => new(null, error);
    }

    // ---------- Raw JSON shapes ----------

    private sealed class CandidateJson
    {
        [JsonPropertyName("signals")] public SignalsJson? Signals { get; init; }
        [JsonPropertyName("strategy")] public string? Strategy { get; init; }
        [JsonPropertyName("response")] public ResponseJson? Response { get; init; }
        [JsonPropertyName("proposalSet")] public ProposalSetJson? ProposalSet { get; init; }
    }

    private sealed class SignalsJson
    {
        [JsonPropertyName("intent")] public string? Intent { get; init; }
        [JsonPropertyName("userExpressedActionIntent")] public bool UserExpressedActionIntent { get; init; }
        [JsonPropertyName("actionIntentQuote")] public string? ActionIntentQuote { get; init; }
        [JsonPropertyName("userRejectedAction")] public bool UserRejectedAction { get; init; }
    }

    private sealed class ResponseJson
    {
        [JsonPropertyName("type")] public string? Type { get; init; }
        [JsonPropertyName("text")] public string? Text { get; init; }
        [JsonPropertyName("question")] public string? Question { get; init; }
    }

    private sealed class ProposalSetJson
    {
        [JsonPropertyName("proposals")] public List<ProposalJson>? Proposals { get; init; }
    }

    private sealed class ProposalJson
    {
        [JsonPropertyName("clientProposalKey")] public string? ClientProposalKey { get; init; }
        [JsonPropertyName("title")] public string? Title { get; init; }
        [JsonPropertyName("description")] public string? Description { get; init; }
        [JsonPropertyName("date")] public string? Date { get; init; }
        [JsonPropertyName("startTime")] public string? StartTime { get; init; }
        [JsonPropertyName("endTime")] public string? EndTime { get; init; }
        [JsonPropertyName("labelId")] public int? LabelId { get; init; }
    }
}
