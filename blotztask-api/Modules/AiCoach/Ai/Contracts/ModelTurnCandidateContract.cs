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
/// The strategy enum exposes pending-card update, but never formal task writes or conversation
/// lifecycle commands. What is absent from the output contract cannot be proposed.
/// </summary>
public static class ModelTurnCandidateContract
{
    public const int SchemaVersion = 6;

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
        required = new[]
        {
            "interpretation", "suggestedAction", "response", "proposalSet", "proposalSetMutation",
        },
        properties = new
        {
            interpretation = new
            {
                type = "object",
                additionalProperties = false,
                required = new[]
                {
                    "intent", "planningItems", "constraints", "planningReferences", "disposition",
                    "actionRequest", "supportRequest",
                },
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
                                text = new { type = "string", description = "A concise interpretation of the quoted item; paraphrasing is allowed. Keep the original wording in evidence.quote." },
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
                                        quote = new { type = "string", description = "Relevant wording from the user's current or recent messages." },
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
                                text = new { type = "string", description = "A concise interpretation of the quoted constraint; preserve its negation, conditions and scope. Keep original wording in evidence.quote." },
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
                    planningReferences = new
                    {
                        type = "array",
                        description = "Select, reject, or supersede an active retained planning item using only ephemeral planning_item_N keys from the current turn frame. Use an empty array when the current message does not refer to a retained item.",
                        items = new
                        {
                            type = "object",
                            additionalProperties = false,
                            required = new[] { "referenceKey", "kind", "evidence" },
                            properties = new
                            {
                                referenceKey = new { type = "string" },
                                kind = new
                                {
                                    type = "string",
                                    @enum = new[] { "selected", "rejected", "superseded" },
                                },
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
                    actionRequest = EvidenceKindSchema(
                        new[]
                        {
                            "none", "action_mention", "advice_request", "explicit_planning_request",
                            "direct_instruction", "referenced_instruction",
                        },
                        "How the CURRENT message relates to action. Interpret the request; the server determines whether a proposal is allowed.",
                        includeReferencedItemKey: true),
                    supportRequest = new
                    {
                        type = "object", additionalProperties = false,
                        required = new[] { "kind", "evidence", "scope" },
                        properties = new
                        {
                            kind = new { type = "string", @enum = new[]
                            {
                                "unspecified", "wants_listening", "wants_exploration", "wants_perspective",
                                "wants_advice", "rejects_advice", "wants_pause", "clears_preference",
                            } },
                            evidence = new
                            {
                                type = new[] { "object", "null" }, additionalProperties = false,
                                required = new[] { "quote" },
                                properties = new { quote = new { type = "string" } },
                            },
                            scope = new
                            {
                                type = "string", @enum = new[] { "turn", "conversation" },
                                description = "Default turn. Use conversation ONLY for an explicit ongoing response preference; quote must include its duration/scope. A one-off question or pause is turn scoped.",
                            },
                        },
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
                    "update_proposal_set",
                },
                description = "Your chosen conversation strategy for this turn. It must be one the "
                              + "current turn allows (see the turn frame).",
            },
            response = new
            {
                type = "object",
                additionalProperties = false,
                required = new[] { "type", "text", "question", "questionTopic", "supportMove" },
                properties = new
                {
                    type = new
                    {
                        type = "string",
                        @enum = new[]
                        {
                            "listening", "gentle_question", "clarifying_question",
                            "goal_choice", "proposal_introduction", "proposal_update",
                        },
                        description = "Must match the strategy: continue_listening/discuss_existing_proposal -> "
                                      + "listening; ask_gentle_question -> gentle_question; ask_clarifying_question -> "
                                      + "clarifying_question; ask_user_to_choose_goal -> goal_choice; "
                                      + "show_proposal_set -> proposal_introduction; "
                                      + "update_proposal_set -> proposal_update.",
                    },
                    text = new
                    {
                        type = "string",
                        description = "The COMPLETE reply shown to the user, in the user's language. "
                                      + "Be concise but substantive within the frame's length budget; mixed response moves are allowed.",
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
                    supportMove = new
                    {
                        type = new[] { "string", "null" },
                        @enum = new[]
                        {
                            "acknowledge", "reflect", "gentle_question", "offer_perspective",
                            "offer_advice", "respect_pause", null,
                        },
                        description = "The main Companion response move, not an exhaustive list of every sentence. Null outside Companion mode.",
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
            proposalSetMutation = new
            {
                type = new[] { "object", "null" },
                additionalProperties = false,
                required = new[] { "artifactReferenceKey", "operations", "ambiguities" },
                description = "ONLY for changing the current pending card. Use ephemeral item_N references from the turn frame. "
                              + "If the target, operation, field, or value is unclear, report an ambiguity and ask one focused question; do not guess.",
                properties = new
                {
                    artifactReferenceKey = new { type = "string", @enum = new[] { ProposalReferenceKeys.CurrentArtifact } },
                    operations = new
                    {
                        type = "array",
                        maxItems = ProposalSetMutationHandler.MaxOperationsPerTurn,
                        items = new
                        {
                            type = "object",
                            additionalProperties = false,
                            required = new[]
                            {
                                "kind", "operationKey", "targetReferenceKey", "changedFields",
                                "title", "description", "date", "startTime", "endTime", "labelId", "evidence",
                            },
                            properties = new
                            {
                                kind = new { type = "string", @enum = new[] { "add", "update", "remove" } },
                                operationKey = new { type = "string" },
                                targetReferenceKey = new
                                {
                                    type = new[] { "string", "null" },
                                    description = "item_N for update/remove; null for add.",
                                },
                                changedFields = new
                                {
                                    type = "array",
                                    items = new
                                    {
                                        type = "string",
                                        @enum = new[] { "title", "description", "date", "start_time", "end_time", "label_id" },
                                    },
                                    description = "Update only. Fields omitted here remain unchanged; null clears only description/label_id.",
                                },
                                title = new { type = new[] { "string", "null" } },
                                description = new { type = new[] { "string", "null" } },
                                date = new { type = new[] { "string", "null" } },
                                startTime = new { type = new[] { "string", "null" } },
                                endTime = new { type = new[] { "string", "null" } },
                                labelId = new { type = new[] { "integer", "null" } },
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
                    ambiguities = new
                    {
                        type = "array",
                        maxItems = 3,
                        items = new
                        {
                            type = "object",
                            additionalProperties = false,
                            required = new[] { "kind", "candidateReferenceKeys", "field", "evidence" },
                            properties = new
                            {
                                kind = new
                                {
                                    type = "string",
                                    @enum = new[]
                                    {
                                        "target_unclear", "operation_unclear", "field_unclear",
                                        "replacement_value_missing", "multiple_targets_possible", "conflicting_instructions",
                                    },
                                },
                                candidateReferenceKeys = new { type = "array", items = new { type = "string" } },
                                field = new
                                {
                                    type = new[] { "string", "null" },
                                    @enum = new object?[]
                                    {
                                        "title", "description", "date", "start_time", "end_time", "label_id", null,
                                    },
                                },
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
            "proposal_update" => new ProposalUpdateResponse(text),
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

        ProposalSetMutationCandidate? proposalSetMutation = null;
        if (dto.ProposalSetMutation is not null)
        {
            var (mutation, mutationError) = ParseProposalSetMutation(dto.ProposalSetMutation);
            if (mutationError is not null)
                return ParseResult.Failed(mutationError);
            proposalSetMutation = mutation;
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

        var planningReferences = dto.Interpretation.PlanningReferences?
            .Select(reference => new PlanningReferenceCandidate(
                reference.ReferenceKey?.Trim() ?? string.Empty,
                reference.Kind switch
                {
                    "rejected" => PlanningReferenceKind.Rejected,
                    "superseded" => PlanningReferenceKind.Superseded,
                    _ => PlanningReferenceKind.Selected,
                },
                new EvidenceReference(reference.Evidence?.Quote?.Trim() ?? string.Empty)))
            .ToList() ?? [];

        var actionRequest = new ActionRequestCandidate(
            ParseActionRequest(dto.Interpretation.ActionRequest?.Kind),
            ToEvidence(dto.Interpretation.ActionRequest?.Evidence),
            dto.Interpretation.ActionRequest?.ReferencedItemKey?.Trim());
        var supportRequest = new SupportRequestCandidate(
            ParseSupportRequest(dto.Interpretation.SupportRequest?.Kind),
            ToEvidence(dto.Interpretation.SupportRequest?.Evidence),
            dto.Interpretation.SupportRequest?.Scope == "conversation"
                ? SupportPreferenceScope.Conversation : SupportPreferenceScope.Turn);

        return ParseResult.Success(new ModelTurnCandidate(
            new InterpretationCandidate(
                intent, planningItems, constraints, dispositionCandidate, actionRequest, supportRequest,
                planningReferences),
            strategy.Value,
            response,
            proposalSet,
            ParseSupportMove(dto.Response.SupportMove),
            proposalSetMutation));
    }

    private static object EvidenceKindSchema(
        string[] kinds,
        string description,
        bool includeReferencedItemKey = false) => new
    {
        type = "object",
        additionalProperties = false,
        required = includeReferencedItemKey
            ? new[] { "kind", "evidence", "referencedItemKey" }
            : new[] { "kind", "evidence" },
        properties = new
        {
            kind = new { type = "string", @enum = kinds },
            evidence = new
            {
                type = new[] { "object", "null" },
                additionalProperties = false,
                required = new[] { "quote" },
                properties = new { quote = new { type = "string" } },
            },
            referencedItemKey = new
            {
                type = new[] { "string", "null" },
                description = "Required only for referenced_instruction; use a planning_item_N key from the current turn frame. Null otherwise.",
            },
        },
        description,
    };

    private static EvidenceReference? ToEvidence(EvidenceJson? evidence) => evidence is null
        ? null
        : new EvidenceReference(evidence.Quote?.Trim() ?? string.Empty);

    private static ActionRequestKind ParseActionRequest(string? value) => value switch
    {
        "action_mention" => ActionRequestKind.ActionMention,
        "advice_request" => ActionRequestKind.AdviceRequest,
        "explicit_planning_request" => ActionRequestKind.ExplicitPlanningRequest,
        "direct_instruction" => ActionRequestKind.DirectInstruction,
        "referenced_instruction" => ActionRequestKind.ReferencedInstruction,
        _ => ActionRequestKind.None,
    };

    private static SupportRequestKind ParseSupportRequest(string? value) => value switch
    {
        "wants_listening" => SupportRequestKind.WantsListening,
        "wants_exploration" => SupportRequestKind.WantsExploration,
        "wants_perspective" => SupportRequestKind.WantsPerspective,
        "wants_advice" => SupportRequestKind.WantsAdvice,
        "rejects_advice" => SupportRequestKind.RejectsAdvice,
        "wants_pause" => SupportRequestKind.WantsPause,
        "clears_preference" => SupportRequestKind.ClearsPreference,
        _ => SupportRequestKind.Unspecified,
    };

    private static SupportMove? ParseSupportMove(string? value) => value switch
    {
        "acknowledge" => SupportMove.Acknowledge,
        "reflect" => SupportMove.Reflect,
        "gentle_question" => SupportMove.GentleQuestion,
        "offer_perspective" => SupportMove.OfferPerspective,
        "offer_advice" => SupportMove.OfferAdvice,
        "respect_pause" => SupportMove.RespectPause,
        _ => null,
    };

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

    private static (ProposalSetMutationCandidate? Mutation, string? Error) ParseProposalSetMutation(
        ProposalSetMutationJson dto)
    {
        var operations = new List<ProposalMutationOperationCandidate>();
        for (var index = 0; index < (dto.Operations?.Count ?? 0); index++)
        {
            var raw = dto.Operations![index];
            var at = $"proposalSetMutation.operations[{index}]";
            var evidence = new EvidenceReference(raw.Evidence?.Quote?.Trim() ?? string.Empty);
            var operationKey = raw.OperationKey?.Trim() ?? string.Empty;

            switch (raw.Kind)
            {
                case "add":
                    if (string.IsNullOrWhiteSpace(raw.Title)
                        || !DateOnly.TryParseExact(raw.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                            DateTimeStyles.None, out var addDate)
                        || !TryParseTime(raw.StartTime, out var addStart)
                        || !TryParseTime(raw.EndTime, out var addEnd))
                        return (null, $"{at}: add requires title, yyyy-MM-dd date, and HH:mm start/end times.");
                    operations.Add(new AddProposalItemCandidate(
                        operationKey,
                        new TaskProposalCandidate(
                            operationKey,
                            raw.Title.Trim(),
                            string.IsNullOrWhiteSpace(raw.Description) ? null : raw.Description.Trim(),
                            addDate,
                            addStart,
                            addEnd,
                            raw.LabelId),
                        evidence));
                    break;

                case "update":
                    if (string.IsNullOrWhiteSpace(raw.TargetReferenceKey))
                        return (null, $"{at}.targetReferenceKey is required for update.");
                    var fields = (raw.ChangedFields ?? [])
                        .Select(ParseProposalField)
                        .Where(field => field.HasValue)
                        .Select(field => field!.Value)
                        .ToHashSet();
                    if (fields.Count != (raw.ChangedFields?.Count ?? 0))
                        return (null, $"{at}.changedFields contains an unknown field.");
                    if (!TryParseOptionalDate(raw.Date, fields.Contains(ProposalField.Date), out var updateDate)
                        || !TryParseOptionalTime(raw.StartTime, fields.Contains(ProposalField.StartTime), out var updateStart)
                        || !TryParseOptionalTime(raw.EndTime, fields.Contains(ProposalField.EndTime), out var updateEnd))
                        return (null, $"{at}: changed date/time values must use yyyy-MM-dd and HH:mm.");
                    operations.Add(new UpdateProposalItemCandidate(
                        operationKey,
                        raw.TargetReferenceKey.Trim(),
                        new ProposalItemPatchCandidate(
                            fields,
                            raw.Title,
                            raw.Description,
                            updateDate,
                            updateStart,
                            updateEnd,
                            raw.LabelId),
                        evidence));
                    break;

                case "remove":
                    if (string.IsNullOrWhiteSpace(raw.TargetReferenceKey))
                        return (null, $"{at}.targetReferenceKey is required for remove.");
                    operations.Add(new RemoveProposalItemCandidate(
                        operationKey,
                        raw.TargetReferenceKey.Trim(),
                        evidence));
                    break;

                default:
                    return (null, $"{at}.kind is unknown.");
            }
        }

        var ambiguities = (dto.Ambiguities ?? []).Select(raw => new ProposalMutationAmbiguityCandidate(
            raw.Kind switch
            {
                "operation_unclear" => ProposalMutationAmbiguityKind.OperationUnclear,
                "field_unclear" => ProposalMutationAmbiguityKind.FieldUnclear,
                "replacement_value_missing" => ProposalMutationAmbiguityKind.ReplacementValueMissing,
                "multiple_targets_possible" => ProposalMutationAmbiguityKind.MultipleTargetsPossible,
                "conflicting_instructions" => ProposalMutationAmbiguityKind.ConflictingInstructions,
                _ => ProposalMutationAmbiguityKind.TargetUnclear,
            },
            raw.CandidateReferenceKeys ?? [],
            ParseProposalField(raw.Field),
            new EvidenceReference(raw.Evidence?.Quote?.Trim() ?? string.Empty))).ToList();

        return (new ProposalSetMutationCandidate(
            dto.ArtifactReferenceKey?.Trim() ?? string.Empty,
            operations,
            ambiguities), null);
    }

    private static ProposalField? ParseProposalField(string? value) => value switch
    {
        "title" => ProposalField.Title,
        "description" => ProposalField.Description,
        "date" => ProposalField.Date,
        "start_time" => ProposalField.StartTime,
        "end_time" => ProposalField.EndTime,
        "label_id" => ProposalField.LabelId,
        _ => null,
    };

    private static bool TryParseOptionalDate(string? value, bool required, out DateOnly? date)
    {
        date = null;
        if (!required)
            return true;
        if (value is null || !DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var parsed))
            return false;
        date = parsed;
        return true;
    }

    private static bool TryParseOptionalTime(string? value, bool required, out TimeOnly? time)
    {
        time = null;
        if (!required)
            return true;
        if (!TryParseTime(value, out var parsed))
            return false;
        time = parsed;
        return true;
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
        [JsonPropertyName("proposalSetMutation")] public ProposalSetMutationJson? ProposalSetMutation { get; init; }
    }

    private sealed class InterpretationJson
    {
        [JsonPropertyName("intent")] public string? Intent { get; init; }
        [JsonPropertyName("planningItems")] public List<PlanningItemJson>? PlanningItems { get; init; }
        [JsonPropertyName("constraints")] public List<ConstraintJson>? Constraints { get; init; }
        [JsonPropertyName("planningReferences")] public List<PlanningReferenceJson>? PlanningReferences { get; init; }
        [JsonPropertyName("disposition")] public DispositionJson? Disposition { get; init; }
        [JsonPropertyName("actionRequest")] public EvidenceKindJson? ActionRequest { get; init; }
        [JsonPropertyName("supportRequest")] public EvidenceKindJson? SupportRequest { get; init; }
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

    private sealed class PlanningReferenceJson
    {
        [JsonPropertyName("referenceKey")] public string? ReferenceKey { get; init; }
        [JsonPropertyName("kind")] public string? Kind { get; init; }
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

    private sealed class EvidenceKindJson
    {
        [JsonPropertyName("scope")] public string? Scope { get; init; }
        [JsonPropertyName("kind")] public string? Kind { get; init; }
        [JsonPropertyName("evidence")] public EvidenceJson? Evidence { get; init; }
        [JsonPropertyName("referencedItemKey")] public string? ReferencedItemKey { get; init; }
    }

    private sealed class ResponseJson
    {
        [JsonPropertyName("type")] public string? Type { get; init; }
        [JsonPropertyName("text")] public string? Text { get; init; }
        [JsonPropertyName("question")] public string? Question { get; init; }
        [JsonPropertyName("questionTopic")] public string? QuestionTopic { get; init; }
        [JsonPropertyName("supportMove")] public string? SupportMove { get; init; }
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

    private sealed class ProposalSetMutationJson
    {
        [JsonPropertyName("artifactReferenceKey")] public string? ArtifactReferenceKey { get; init; }
        [JsonPropertyName("operations")] public List<ProposalMutationOperationJson>? Operations { get; init; }
        [JsonPropertyName("ambiguities")] public List<ProposalMutationAmbiguityJson>? Ambiguities { get; init; }
    }

    private sealed class ProposalMutationOperationJson
    {
        [JsonPropertyName("kind")] public string? Kind { get; init; }
        [JsonPropertyName("operationKey")] public string? OperationKey { get; init; }
        [JsonPropertyName("targetReferenceKey")] public string? TargetReferenceKey { get; init; }
        [JsonPropertyName("changedFields")] public List<string>? ChangedFields { get; init; }
        [JsonPropertyName("title")] public string? Title { get; init; }
        [JsonPropertyName("description")] public string? Description { get; init; }
        [JsonPropertyName("date")] public string? Date { get; init; }
        [JsonPropertyName("startTime")] public string? StartTime { get; init; }
        [JsonPropertyName("endTime")] public string? EndTime { get; init; }
        [JsonPropertyName("labelId")] public int? LabelId { get; init; }
        [JsonPropertyName("evidence")] public EvidenceJson? Evidence { get; init; }
    }

    private sealed class ProposalMutationAmbiguityJson
    {
        [JsonPropertyName("kind")] public string? Kind { get; init; }
        [JsonPropertyName("candidateReferenceKeys")] public List<string>? CandidateReferenceKeys { get; init; }
        [JsonPropertyName("field")] public string? Field { get; init; }
        [JsonPropertyName("evidence")] public EvidenceJson? Evidence { get; init; }
    }
}
