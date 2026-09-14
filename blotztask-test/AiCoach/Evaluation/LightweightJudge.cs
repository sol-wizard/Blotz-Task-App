using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using System.Text.Encodings.Web;
using System.Text.Json;

namespace BlotzTask.Tests.AiCoach.Evaluation;

/// <summary>Four 1-5 scores (eval plan §9.2). Passed = every dimension at least 3.</summary>
public sealed record QuestionJudgement(
    int Necessary,
    int Focused,
    int InformationGain,
    int ModeFit,
    string ReasonCode,
    string Reason)
{
    public bool Passed => Necessary >= 3 && Focused >= 3 && InformationGain >= 3 && ModeFit >= 3;
}

/// <summary>PASS or one FAIL_* label (eval plan §10.2).</summary>
public sealed record ResponseJudgement(string Label, string Reason)
{
    public bool Passed => Label == "PASS";
}

/// <summary>
/// Lightweight LLM judge for the SOFT quality signals only. It never overrides a hard rule, and
/// its scores are used for a decision only after the 12-sample calibration passes (§9.3). The
/// same deployment judges itself — an accepted limitation for a feasibility pass.
/// </summary>
public sealed class LightweightJudge(IModelGateway gateway)
{
    public const string Version = "judge-v1";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private static readonly string QuestionSchema = JsonSerializer.Serialize(new
    {
        type = "object",
        additionalProperties = false,
        required = new[] { "necessary", "focused", "informationGain", "modeFit", "reasonCode", "reason" },
        properties = new
        {
            necessary = new { type = "integer", description = "1-5: was a question needed at all right now?" },
            focused = new { type = "integer", description = "1-5: asks exactly one thing the user can easily answer." },
            informationGain = new { type = "integer", description = "1-5: the answer would move the conversation goal forward." },
            modeFit = new { type = "integer", description = "1-5: fits the mode (Execution: efficient; Companion: low pressure)." },
            reasonCode = new
            {
                type = "string",
                @enum = new[]
                {
                    "USEFUL_SINGLE_QUESTION", "UNNECESSARY_QUESTION", "MULTIPLE_QUESTIONS",
                    "REPEATED_QUESTION", "LOW_INFORMATION_GAIN", "MODE_MISMATCH",
                },
            },
            reason = new { type = "string", description = "One sentence." },
        },
    });

    private static readonly string ResponseSchema = JsonSerializer.Serialize(new
    {
        type = "object",
        additionalProperties = false,
        required = new[] { "label", "reason" },
        properties = new
        {
            label = new
            {
                type = "string",
                @enum = new[]
                {
                    "PASS", "FAIL_MISSED_USER_NEED", "FAIL_UNREQUESTED_ADVICE",
                    "FAIL_MODE_MISMATCH", "FAIL_UNSUPPORTED_CLAIM",
                },
            },
            reason = new { type = "string", description = "One sentence." },
        },
    });

    private const string QuestionSystemPrompt = """
        You are a strict evaluator for an AI coaching assistant that talks to students about their tasks and feelings.
        Judge ONLY the assistant's latest question, in the context of the conversation.

        Mode rules:
        - Execution mode: efficient. The assistant turns concrete, schedulable actions into a draft card. It should ask
          a question only when one specific missing detail truly blocks a sensible draft, and never re-ask something
          the user already answered, already handed over to the assistant ("你帮我列" / "you decide"), or explicitly
          gave (date, time, duration).
        - Companion mode: low pressure. The assistant listens by default, asks at most one gentle question, never
          pushes tasks or schedules unless the user explicitly asks for that, and stops asking when the user says so.

        Score each dimension 1-5 (1 = clearly bad, 3 = acceptable, 5 = excellent):
        necessary, focused (exactly one thing, easy to answer), informationGain, modeFit.
        A question that repeats the previous assistant question, bundles several questions, or is answered by the
        user's own message scores 1-2 on the relevant dimension. Pick the single best reasonCode.
        """;

    private const string ResponseSystemPrompt = """
        You are a strict evaluator for an AI coaching assistant that talks to students about their tasks and feelings.
        Judge ONLY the assistant's latest reply, in the context of the conversation, against the MustAddress and
        MustNotDo lists you are given.

        Labels:
        - PASS: the reply addresses every MustAddress point and does none of the MustNotDo items.
        - FAIL_MISSED_USER_NEED: it ignores the user's most important expression or a MustAddress point.
        - FAIL_UNREQUESTED_ADVICE: it gives advice, plans or next steps the user did not ask for (or asked NOT to get).
        - FAIL_MODE_MISMATCH: Companion reply that pushes tasks/planning, or Execution reply that deflects the decision
          back to the user instead of drafting.
        - FAIL_UNSUPPORTED_CLAIM: it claims something not supported by the conversation (e.g. a task was saved, or a
          feeling the user never expressed).
        Be literal about the lists. Short replies are fine.
        """;

    public async Task<(QuestionJudgement? Judgement, int TotalTokens)> JudgeQuestionAsync(
        AiCoachMode mode,
        string transcript,
        string question,
        CancellationToken ct = default)
    {
        var user = $"""
            Mode: {mode}

            Conversation (the last assistant line contains the question being judged):
            {transcript}

            Question under evaluation:
            {question}
            """;
        var completion = await gateway.CompleteAsync(
            new ModelGatewayRequest(
                QuestionSystemPrompt,
                [new GatewayUserMessage(user)],
                Tools: [],
                ResponseFormat: new ResponseFormatSpec("question_judgement", QuestionSchema)),
            ct);

        var parsed = TryParse<QuestionJudgementJson>(completion.AssistantText);
        if (parsed is null)
            return (null, completion.TotalTokens);

        return (new QuestionJudgement(
            Clamp(parsed.Necessary), Clamp(parsed.Focused), Clamp(parsed.InformationGain), Clamp(parsed.ModeFit),
            parsed.ReasonCode ?? "UNKNOWN", parsed.Reason ?? string.Empty), completion.TotalTokens);
    }

    public async Task<(ResponseJudgement? Judgement, int TotalTokens)> JudgeResponseAsync(
        AiCoachMode mode,
        string transcript,
        string reply,
        IReadOnlyList<string> mustAddress,
        IReadOnlyList<string> mustNotDo,
        CancellationToken ct = default)
    {
        var user = $"""
            Mode: {mode}

            Conversation (the last assistant line is the reply being judged):
            {transcript}

            Reply under evaluation:
            {reply}

            MustAddress:
            {(mustAddress.Count == 0 ? "- (none)" : string.Join("\n", mustAddress.Select(x => "- " + x)))}

            MustNotDo:
            {(mustNotDo.Count == 0 ? "- (none)" : string.Join("\n", mustNotDo.Select(x => "- " + x)))}
            """;
        var completion = await gateway.CompleteAsync(
            new ModelGatewayRequest(
                ResponseSystemPrompt,
                [new GatewayUserMessage(user)],
                Tools: [],
                ResponseFormat: new ResponseFormatSpec("response_judgement", ResponseSchema)),
            ct);

        var parsed = TryParse<ResponseJudgementJson>(completion.AssistantText);
        return parsed is null
            ? (null, completion.TotalTokens)
            : (new ResponseJudgement(parsed.Label ?? "UNKNOWN", parsed.Reason ?? string.Empty), completion.TotalTokens);
    }

    private static T? TryParse<T>(string? raw) where T : class
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        try
        {
            return JsonSerializer.Deserialize<T>(raw, Json);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static int Clamp(int value) => Math.Clamp(value, 1, 5);

    private sealed class QuestionJudgementJson
    {
        public int Necessary { get; init; }
        public int Focused { get; init; }
        public int InformationGain { get; init; }
        public int ModeFit { get; init; }
        public string? ReasonCode { get; init; }
        public string? Reason { get; init; }
    }

    private sealed class ResponseJudgementJson
    {
        public string? Label { get; init; }
        public string? Reason { get; init; }
    }
}
