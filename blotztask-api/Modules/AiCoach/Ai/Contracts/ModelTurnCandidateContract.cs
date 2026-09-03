using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Ai.Contracts;

/// <summary>
/// The model-facing JSON contract for one turn (v3 tech design §10) and its parser — the Model
/// Output Schema Guard. The JSON schema handed to the model as a structured-output response
/// format and the runtime validation both derive from this single file, so they cannot drift.
///
/// The strategy enum deliberately exposes only the strategies a model turn may candidate
/// (no update/supersede/close): what is not in the output contract can never be proposed.
/// </summary>
public static class ModelTurnCandidateContract
{
    public const int SchemaVersion = 2;

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
        required = new[] { "interpretation", "suggestedAction", "response", "proposalSet" },
        properties = new
        {
            interpretation = new
            {
                type = "object",
                additionalProperties = false,
                required = new[] { "intent", "planningItems", "constraints", "disposition" },
                properties = new
                {
                    intent = new
                    {
                        type = "string",
                        @enum = new[] { "small_talk", "goal", "concrete_action", "question", "emotional", "unknown" },
                        description = "What the CURRENT user message mainly is.",
                    },
                    planningItems = new
                    {
                        type = "array",
                        description = "Only goals, domains, or actionable items explicitly named in the CURRENT user message. "
                                      + "Never copy items from earlier messages or the active planning intent. "
                                      + "If the current message only asks to edit, add to, confirm, reject, or discuss an existing card, use an empty array.",
                        items = new
                        {
                            type = "object",
                            additionalProperties = false,
                            required = new[] { "text", "kind", "evidence" },
                            properties = new
                            {
                                text = new { type = "string", description = "A concise item name that appears literally inside evidence.quote." },
                                kind = new
                                {
                                    type = "string",
                                    @enum = new[] { "domain", "goal", "action" },
                                    description = "domain or goal is not directly schedulable; action is concrete and schedulable.",
                                },
                                evidence = new
                                {
                                    type = "object",
                                    additionalProperties = false,
                                    required = new[] { "quote" },
                                    properties = new
                                    {
                                        quote = new { type = "string", description = "Exact substring from the current user message." },
                                    },
                                },
                            },
                        },
                    },
                    constraints = new
                    {
                        type = "array",
                        items = new
                        {
                            type = "object",
                            additionalProperties = false,
                            required = new[] { "text", "evidence" },
                            properties = new
                            {
                                text = new { type = "string", description = "A concise constraint that appears literally inside evidence.quote." },
                                evidence = new
                                {
                                    type = "object",
                                    additionalProperties = false,
                                    required = new[] { "quote" },
                                    properties = new { quote = new { type = "string" } },
                                },
                            },
                        },
                    },
                    disposition = new
                    {
                        type = "object",
                        additionalProperties = false,
                        required = new[] { "kind", "evidence" },
                        properties = new
                        {
                            kind = new
                            {
                                type = "string",
                                @enum = new[] { "not_applicable", "answered", "cannot_provide", "delegated_to_coach", "rejected_action" },
                            },
                            evidence = new
                            {
                                type = new[] { "object", "null" },
                                additionalProperties = false,
                                required = new[] { "quote" },
                                properties = new { quote = new { type = "string" } },
                            },
                        },
                        description = "The user's explicit disposition with an exact quote. Evidence is null only for not_applicable.",
                    },
                },
            },
            suggestedAction = new
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
                required = new[] { "type", "text", "question", "questionTopic" },
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
                    questionTopic = new
                    {
                        type = new[] { "string", "null" },
                        @enum = new[] { "concrete_step", "priority", "scope", "deadline", "other", null },
                        description = "The information slot this question asks about. Required for question responses; null otherwise.",
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

        if (dto?.Interpretation is null || dto.Response is null)
            return ParseResult.Failed("interpretation and response are required.");

        var strategy = ConversationStrategyExtensions.FromWireValue(dto.SuggestedAction ?? "");
        if (strategy is null)
            return ParseResult.Failed($"Unknown suggestedAction '{dto.SuggestedAction}'.");

        if (string.IsNullOrWhiteSpace(dto.Response.Text))
            return ParseResult.Failed("response.text must not be empty.");

        var text = dto.Response.Text.Trim();
        var question = string.IsNullOrWhiteSpace(dto.Response.Question) ? null : dto.Response.Question.Trim();

        var questionTopic = ParseClarificationTopic(dto.Response.QuestionTopic);
        AssistantResponseCandidate? response = dto.Response.Type switch
        {
            "listening" => new ListeningResponse(text),
            "gentle_question" when question is not null => new GentleQuestionResponse(text, question, questionTopic),
            "clarifying_question" when question is not null => new ClarifyingQuestionResponse(text, question, questionTopic),
            "goal_choice" when question is not null => new GoalChoiceResponse(text, question, questionTopic),
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

        var intent = dto.Interpretation.Intent switch
        {
            "small_talk" => IntentType.SmallTalk,
            "goal" => IntentType.Goal,
            "concrete_action" => IntentType.ConcreteAction,
            "question" => IntentType.Question,
            "emotional" => IntentType.Emotional,
            _ => IntentType.Unknown,
        };

        var planningItems = dto.Interpretation.PlanningItems?
            .Select(item => new PlanningItemCandidate(
                item.Text?.Trim() ?? string.Empty,
                new EvidenceReference(item.Evidence?.Quote?.Trim() ?? string.Empty),
                item.Kind switch
                {
                    "domain" => PlanningItemKind.Domain,
                    "goal" => PlanningItemKind.Goal,
                    _ => PlanningItemKind.Action,
                }))
            .ToList() ?? [];

        var constraints = dto.Interpretation.Constraints?
            .Select(item => new ConstraintCandidate(
                item.Text?.Trim() ?? string.Empty,
                new EvidenceReference(item.Evidence?.Quote?.Trim() ?? string.Empty)))
            .ToList() ?? [];

        var disposition = dto.Interpretation.Disposition?.Kind switch
        {
            "answered" => UserTurnDisposition.Answered,
            "cannot_provide" => UserTurnDisposition.CannotProvide,
            "delegated_to_coach" => UserTurnDisposition.DelegatedToCoach,
            "rejected_action" => UserTurnDisposition.RejectedAction,
            _ => UserTurnDisposition.NotApplicable,
        };
        var dispositionCandidate = new UserTurnDispositionCandidate(
            disposition,
            dto.Interpretation.Disposition?.Evidence is null
                ? null
                : new EvidenceReference(dto.Interpretation.Disposition.Evidence.Quote?.Trim() ?? string.Empty));

        return ParseResult.Success(new ModelTurnCandidate(
            new InterpretationCandidate(intent, planningItems, constraints, dispositionCandidate),
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

    private static ClarificationTopic ParseClarificationTopic(string? value) => value switch
    {
        "priority" => ClarificationTopic.Priority,
        "scope" => ClarificationTopic.Scope,
        "deadline" => ClarificationTopic.Deadline,
        "other" => ClarificationTopic.Other,
        _ => ClarificationTopic.ConcreteStep,
    };

    public sealed record ParseResult(ModelTurnCandidate? Candidate, string? Error)
    {
        public bool IsSuccess => Candidate is not null;

        public static ParseResult Success(ModelTurnCandidate candidate) => new(candidate, null);

        public static ParseResult Failed(string error) => new(null, error);
    }

    // ---------- Raw JSON shapes ----------

    private sealed class CandidateJson
    {
        [JsonPropertyName("interpretation")] public InterpretationJson? Interpretation { get; init; }
        [JsonPropertyName("suggestedAction")] public string? SuggestedAction { get; init; }
        [JsonPropertyName("response")] public ResponseJson? Response { get; init; }
        [JsonPropertyName("proposalSet")] public ProposalSetJson? ProposalSet { get; init; }
    }

    private sealed class InterpretationJson
    {
        [JsonPropertyName("intent")] public string? Intent { get; init; }
        [JsonPropertyName("planningItems")] public List<PlanningItemJson>? PlanningItems { get; init; }
        [JsonPropertyName("constraints")] public List<ConstraintJson>? Constraints { get; init; }
        [JsonPropertyName("disposition")] public DispositionJson? Disposition { get; init; }
    }

    private sealed class PlanningItemJson
    {
        [JsonPropertyName("text")] public string? Text { get; init; }
        [JsonPropertyName("kind")] public string? Kind { get; init; }
        [JsonPropertyName("evidence")] public EvidenceJson? Evidence { get; init; }
    }

    private sealed class ConstraintJson
    {
        [JsonPropertyName("text")] public string? Text { get; init; }
        [JsonPropertyName("evidence")] public EvidenceJson? Evidence { get; init; }
    }

    private sealed class EvidenceJson
    {
        [JsonPropertyName("quote")] public string? Quote { get; init; }
    }

    private sealed class DispositionJson
    {
        [JsonPropertyName("kind")] public string? Kind { get; init; }
        [JsonPropertyName("evidence")] public EvidenceJson? Evidence { get; init; }
    }

    private sealed class ResponseJson
    {
        [JsonPropertyName("type")] public string? Type { get; init; }
        [JsonPropertyName("text")] public string? Text { get; init; }
        [JsonPropertyName("question")] public string? Question { get; init; }
        [JsonPropertyName("questionTopic")] public string? QuestionTopic { get; init; }
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
