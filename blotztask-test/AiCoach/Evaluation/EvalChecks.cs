using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Tests.AiCoach.Evaluation;

/// <summary>
/// The minimal high-value assertions of eval plan §8 / §9.1 / §10.1, evaluated against the
/// runtime's public outcome and the Kernel's authoritative state — never against log text.
/// </summary>
public static class EvalChecks
{
    private static readonly string[] SavedClaimMarkers =
    [
        "已保存", "已创建", "已经创建", "已添加", "已加入", "已经加入", "已经保存", "已经添加",
        "saved", "created", "added to",
    ];

    private static readonly string[] InternalNameMarkers =
    [
        "Strategy", "Policy", "ProposalSet", "Guard", "Kernel", "Fallback",
        "continue_listening", "show_proposal_set", "ask_gentle_question", "ask_clarifying_question",
    ];

    public static IReadOnlyList<EvalCheckResult> Evaluate(
        string caseId,
        EvalTurn turn,
        EvalTurnResult result,
        AiCoachModeDefinition mode)
    {
        var id = $"{caseId}.T{result.TurnIndex}";
        var checks = new List<EvalCheckResult>();
        var modelResult = result.ModelResult;
        var outcome = result.Outcome;

        void Add(string name, string category, CheckSeverity severity, bool passed, string expected, string actual) =>
            checks.Add(new EvalCheckResult($"{id}.{name}", category, severity, passed, expected, actual));

        Add("COMPLETION", "COMPLETION", CheckSeverity.Hard,
            modelResult.CompletionReason == ModelTurnCompletionReason.Completed,
            "Completed", modelResult.CompletionReason.ToString());
        Add("KERNEL_ACCEPTED", "CONVERSATION_STATE", CheckSeverity.Hard,
            result.Transition.IsAccepted,
            "kernel accepts the turn result",
            result.Transition.IsAccepted ? "accepted" : $"rejected: {result.Transition.Rejection}");

        if (outcome is null)
            return checks;

        var text = outcome.AssistantMessage;

        Add("STRATEGY", "STRATEGY", CheckSeverity.Hard,
            turn.AllowedStrategies.Contains(outcome.FinalStrategy),
            string.Join("|", turn.AllowedStrategies),
            $"{outcome.FinalStrategy} ({outcome.DecisionType}/{outcome.ReasonCode})");

        // ---- Q1-Q4: question policy, count, topic, repetition ----
        var hasQuestion = !string.IsNullOrWhiteSpace(outcome.Question);
        var visibleQuestionMarks = QuestionQualityEvaluator.CountQuestionMarks(text);
        switch (turn.Question.Policy)
        {
            case QuestionPolicy.Required:
                Add("QUESTION_REQUIRED", "QUESTION_POLICY", CheckSeverity.Hard, hasQuestion,
                    "a question is asked", hasQuestion ? outcome.Question! : "no question");
                break;
            case QuestionPolicy.Forbidden:
                Add("QUESTION_FORBIDDEN", "QUESTION_POLICY", CheckSeverity.Hard, !hasQuestion,
                    "no question", hasQuestion ? outcome.Question! : "no question");
                break;
        }

        // A question inside a reply whose strategy declares none is invisible to the Kernel:
        // it is never tracked as OpenQuestion and never counts toward question cadence.
        if (!hasQuestion)
        {
            Add("UNDECLARED_QUESTION", "RESPONSE_GUARD", CheckSeverity.Soft, visibleQuestionMarks == 0,
                "no question mark in a reply whose strategy asks no question",
                $"{visibleQuestionMarks} question mark(s) in a {outcome.FinalStrategy} reply: {text}");
        }

        if (hasQuestion)
        {
            var marksInQuestion = QuestionQualityEvaluator.CountQuestionMarks(outcome.Question);
            Add("QUESTION_COUNT", "QUESTION_POLICY", CheckSeverity.Hard,
                visibleQuestionMarks <= Math.Max(1, mode.Policy.MaxQuestionsPerTurn) && marksInQuestion <= 1,
                "one core question",
                $"{visibleQuestionMarks} question mark(s) in reply, {marksInQuestion} in question field: {text}");

            if (turn.Question.ExpectedTopic is { } topic)
            {
                Add("QUESTION_TOPIC", "QUESTION_POLICY", CheckSeverity.Hard, outcome.QuestionTopic == topic,
                    topic.ToString(), outcome.QuestionTopic?.ToString() ?? "null");
            }

            if (turn.Question.MustNotRepeatPreviousQuestion && result.PreviousAssistantQuestion is { } previous)
            {
                Add("QUESTION_REPEAT", "QUESTION_POLICY", CheckSeverity.Hard,
                    !QuestionQualityEvaluator.IsRepeat(outcome.Question!, previous),
                    $"not a repeat of \"{previous}\"", outcome.Question!);
            }

            if (outcome.FinalStrategy is ConversationStrategy.AskClarifyingQuestion or ConversationStrategy.AskUserToChooseGoal
                && outcome.QuestionTopic is { } askedTopic
                && result.StateBefore.ActivePlanningIntent?.AskedTopics is { } consumed)
            {
                Add("QUESTION_TOPIC_CONSUMED", "QUESTION_POLICY", CheckSeverity.Hard, !consumed.Contains(askedTopic),
                    $"topic not among already-asked {string.Join(",", consumed)}", askedTopic.ToString());
            }
        }

        // ---- Proposal authorization and payload ----
        var proposals = outcome.AcceptedProposals ?? [];
        var count = proposals.Count;
        switch (turn.Proposal.Policy)
        {
            case ProposalPolicy.Required:
                Add("PROPOSAL_REQUIRED", "PROPOSAL_POLICY", CheckSeverity.Hard, count > 0,
                    "at least one accepted proposal", $"{count} proposal(s); reply: {text}");
                break;
            case ProposalPolicy.Forbidden:
                Add("PROPOSAL_FORBIDDEN", "PROPOSAL_POLICY", CheckSeverity.Hard, count == 0,
                    "no proposal", $"{count} proposal(s): {Describe(proposals)}");
                break;
        }

        if (turn.Proposal.ExpectedCount is { } expectedCount)
        {
            Add("PROPOSAL_COUNT", "PROPOSAL_POLICY", CheckSeverity.Hard, count == expectedCount,
                expectedCount.ToString(), $"{count}: {Describe(proposals)}");
        }

        if (turn.Proposal.MaxCount is { } maxCount)
        {
            Add("PROPOSAL_MAX_COUNT", "PROPOSAL_POLICY", CheckSeverity.Hard, count <= maxCount,
                $"at most {maxCount}", $"{count}: {Describe(proposals)}");
        }

        if (count > 0)
        {
            if (turn.Proposal.ExpectedDates is { } dates)
            {
                for (var i = 0; i < dates.Count && i < count; i++)
                {
                    Add($"PROPOSAL_DATE_{i}", "PROPOSAL_PAYLOAD", CheckSeverity.Hard, proposals[i].Date == dates[i],
                        dates[i].ToString("yyyy-MM-dd"), proposals[i].Date.ToString("yyyy-MM-dd"));
                }
            }

            if (turn.Proposal.ExpectedStartTime is { } start)
            {
                Add("PROPOSAL_START", "PROPOSAL_PAYLOAD", CheckSeverity.Hard, proposals[0].StartTime == start,
                    start.ToString("HH:mm"), proposals[0].StartTime.ToString("HH:mm"));
            }

            if (turn.Proposal.ExpectedDurationMinutes is { } minutes)
            {
                var actual = (proposals[0].EndTime - proposals[0].StartTime).TotalMinutes;
                Add("PROPOSAL_DURATION", "PROPOSAL_PAYLOAD", CheckSeverity.Hard, Math.Abs(actual - minutes) < 0.5,
                    $"{minutes} min", $"{actual} min");
            }

            Add("NO_SAVED_CLAIM", "RESPONSE_GUARD", CheckSeverity.Hard, !ContainsAny(text, SavedClaimMarkers),
                "reply never claims the task is saved/created", text);

            var set = result.StateAfter.CurrentProposalSet;
            Add("PENDING_NOT_PERSISTED", "CONVERSATION_STATE", CheckSeverity.Hard,
                set is { Status: ProposalSetStatus.Pending } && set.Proposals.All(p => p.PersistedTaskId is null),
                "card is Pending and no formal task exists",
                set is null ? "no current set" : $"{set.Status}, persisted={set.Proposals.Count(p => p.PersistedTaskId is not null)}");
        }

        Add("NO_INTERNAL_NAMES", "RESPONSE_GUARD", CheckSeverity.Hard, !ContainsAny(text, InternalNameMarkers),
            "no internal strategy/policy/schema names in the reply", text);

        foreach (var forbidden in turn.ReplyMustNotContain ?? [])
        {
            Add($"REPLY_MUST_NOT_CONTAIN[{forbidden}]", "RESPONSE_GUARD", CheckSeverity.Hard,
                !text.Contains(forbidden, StringComparison.OrdinalIgnoreCase), $"reply without \"{forbidden}\"", text);
        }

        // ---- Authoritative state after the turn ----
        if (turn.StateAfter is { } state)
        {
            var after = result.StateAfter;
            if (state.Phase is { } phase)
                Add("STATE_PHASE", "CONVERSATION_STATE", CheckSeverity.Hard, after.Phase == phase, phase.ToString(), after.Phase.ToString());
            if (state.HasPendingProposalSet is { } pending)
            {
                var actual = after.CurrentProposalSet is { IsOpen: true };
                Add("STATE_PENDING_SET", "CONVERSATION_STATE", CheckSeverity.Hard, actual == pending,
                    pending ? "an open proposal set" : "no open proposal set",
                    after.CurrentProposalSet is null ? "none" : after.CurrentProposalSet.Status.ToString());
            }
            if (state.HasOpenQuestion is { } open)
            {
                Add("STATE_OPEN_QUESTION", "CONVERSATION_STATE", CheckSeverity.Hard, (after.OpenQuestion is not null) == open,
                    open ? "an open question" : "no open question", after.OpenQuestion?.Question ?? "none");
            }
            if (state.HasSupportPreference is { } preference)
            {
                var actual = after.CompanionContext?.ExplicitPreference is not null;
                Add("STATE_SUPPORT_PREFERENCE", "CONVERSATION_STATE", CheckSeverity.Hard, actual == preference,
                    preference ? "a stored support preference" : "no stored support preference",
                    after.CompanionContext?.ExplicitPreference?.Kind.ToString() ?? "none");
            }
        }

        // ---- Passed, but only after repair: reported, never a failure on its own (§18.3) ----
        var recovered = modelResult.SchemaCorrectionCount > 0
                        || modelResult.RegenerationCount > 0
                        || modelResult.ProposalRegenerationCount > 0
                        || outcome.FallbackUsed;
        Add("RECOVERED_WITH_ISSUES", "STABILITY", CheckSeverity.Soft, !recovered,
            "first candidate accepted as-is",
            $"modelCalls={modelResult.ModelCallCount} schemaCorrections={modelResult.SchemaCorrectionCount} "
            + $"regenerations={modelResult.RegenerationCount} proposalRegenerations={modelResult.ProposalRegenerationCount} "
            + $"fallbackUsed={outcome.FallbackUsed} reason={outcome.ReasonCode}");

        return checks;
    }

    public static IEnumerable<EvalCheckResult> HardFailures(IEnumerable<EvalCheckResult> checks) =>
        checks.Where(c => !c.Passed && c.Severity == CheckSeverity.Hard);

    public static string Describe(IReadOnlyList<TaskProposal> proposals) =>
        string.Join(" | ", proposals.Select(p => $"{p.Title} {p.Date:yyyy-MM-dd} {p.StartTime:HH\\:mm}-{p.EndTime:HH\\:mm}"));

    private static bool ContainsAny(string text, IEnumerable<string> markers) =>
        markers.Any(marker => text.Contains(marker, StringComparison.Ordinal));
}
