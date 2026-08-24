using BlotzTask.Modules.AiCoach.Ai.Contracts;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Guards;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Ai.Runtime;

public sealed record ModelTurnRequest(
    ConversationSnapshot Snapshot,
    Guid EffectId,
    AiCoachModeDefinition Mode,
    IReadOnlyList<ConversationMessage> RecentMessages,
    string TimeZoneId,
    DateTimeOffset UserLocalNow);

public enum ModelTurnCompletionReason
{
    Completed = 0,
    IterationLimitExceeded = 1,
    ContentFiltered = 2,
    InvalidModelResponse = 3,
    TimedOut = 4,
    Cancelled = 5,
    ModelUnavailable = 6,
}

public sealed record ModelTurnRunResult(
    ModelTurnCompletionReason CompletionReason,
    ValidatedTurnOutcome? Outcome,
    int InputTokens,
    int OutputTokens,
    int TotalTokens);

public interface IModelTurnRuntime
{
    Task<ModelTurnRunResult> ExecuteAsync(ModelTurnRequest request, CancellationToken cancellationToken);
}

/// <summary>
/// The Single-Turn Model Runtime (v3 tech design §5/§7.2): Pre-Policy envelope -> deterministic
/// Model Context -> bounded model call(s) -> Model Output Schema Guard -> Evidence Guard ->
/// Post-Policy -> Response Guard -> ProposalSet Guard, folding everything into ONE
/// <see cref="ValidatedTurnOutcome"/>. It never touches conversation state or the store — the
/// Application layer turns its result into a Kernel event.
///
/// Iteration budget (v3 §21): schema corrections and regenerations share MaxModelIterations —
/// they never stack on top of it. v1 registers no read-only tools, so the tool loop of §16 does
/// not run; its budget rules are already honoured by this shared counter.
/// </summary>
public sealed class ModelTurnRuntime(
    IModelGateway gateway,
    IModelContextBuilder contextBuilder,
    IConversationPrePolicy prePolicy,
    IConversationPostPolicy postPolicy,
    IEvidenceGuard evidenceGuard,
    IResponseGuard responseGuard,
    IProposalSetGuard proposalSetGuard,
    IOptions<AiCoachModuleOptions> options,
    ILogger<ModelTurnRuntime> logger) : IModelTurnRuntime
{
    public async Task<ModelTurnRunResult> ExecuteAsync(ModelTurnRequest request, CancellationToken cancellationToken)
    {
        var limits = options.Value;
        var snapshot = request.Snapshot;
        var envelope = prePolicy.Build(snapshot, request.Mode);

        var context = contextBuilder.Build(new ModelContextRequest(
            snapshot, request.Mode, envelope, request.RecentMessages, request.TimeZoneId, request.UserLocalNow));

        var currentUserMessage = request.RecentMessages
            .LastOrDefault(m => m.Role == ConversationMessageRole.User)?.Content ?? string.Empty;

        // Corrections/regenerations extend this transcript so the model sees what it got wrong.
        var transcript = new List<GatewayMessage>(context.Transcript);

        var iterations = 0;
        var schemaCorrections = 0;
        var regenerations = 0;
        int inputTokens = 0, outputTokens = 0, totalTokens = 0;

        while (iterations < limits.MaxModelIterations)
        {
            iterations++;

            ModelCompletionResult completion;
            try
            {
                using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                timeout.CancelAfter(TimeSpan.FromSeconds(limits.ModelRequestTimeoutSeconds));
                completion = await gateway.CompleteAsync(
                    new ModelGatewayRequest(
                        context.SystemPrompt,
                        transcript,
                        Tools: [],
                        ResponseFormat: new ResponseFormatSpec(
                            ModelTurnCandidateContract.ResponseFormatName,
                            ModelTurnCandidateContract.JsonSchema)),
                    timeout.Token);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                return Fail(ModelTurnCompletionReason.Cancelled);
            }
            catch (OperationCanceledException)
            {
                return Fail(ModelTurnCompletionReason.TimedOut);
            }

            inputTokens += completion.InputTokens;
            outputTokens += completion.OutputTokens;
            totalTokens += completion.TotalTokens;

            // Token visibility per gateway call: the whole system prompt + transcript is re-sent
            // every iteration, so per-call numbers show what each resend costs.
            logger.LogInformation(
                "AiCoach model call: conversation {ConversationId} iteration {Iteration} in={InputTokens} out={OutputTokens}",
                snapshot.ConversationId, iterations, completion.InputTokens, completion.OutputTokens);

            if (completion.FinishReason == ModelFinishReason.ContentFilter)
                return Fail(ModelTurnCompletionReason.ContentFiltered);

            // ---- Model Output Schema Guard (one correction attempt, v3 §21) ----
            var parsed = ModelTurnCandidateContract.Parse(completion.AssistantText);
            if (!parsed.IsSuccess)
            {
                schemaCorrections++;
                if (schemaCorrections > limits.MaxSchemaCorrectionAttempts || iterations >= limits.MaxModelIterations)
                    return Fail(ModelTurnCompletionReason.InvalidModelResponse);

                logger.LogWarning(
                    "AiCoach schema correction for conversation {ConversationId}: {Error}",
                    snapshot.ConversationId, parsed.Error);
                AppendCorrection(transcript, completion.AssistantText,
                    $"[system] Your output was invalid: {parsed.Error} Respond again following the required format exactly.");
                continue;
            }

            var candidate = parsed.Candidate!;

            // ---- Evidence Guard -> Post-Policy ----
            var evidence = evidenceGuard.Verify(candidate.Signals, currentUserMessage);
            if (evidence is { ActionIntentVerified: false, Detail: not null })
                logger.LogInformation(
                    "AiCoach evidence not verified for conversation {ConversationId}: {Detail}",
                    snapshot.ConversationId, evidence.Detail);

            var decision = postPolicy.Decide(new PolicyContext(
                snapshot, envelope, candidate, request.Mode, evidence.ActionIntentVerified));

            if (decision.DecisionType == StrategyDecisionType.RequiresRegeneration)
            {
                regenerations++;
                if (regenerations <= limits.MaxRegenerationAttempts && iterations < limits.MaxModelIterations)
                {
                    logger.LogWarning(
                        "AiCoach regeneration for conversation {ConversationId}: {Reason}",
                        snapshot.ConversationId, decision.ReasonCode);
                    AppendCorrection(transcript, completion.AssistantText,
                        "[system] Your response.type did not match your strategy (or a required field was missing). "
                        + "Pick the strategy again and make the response type match it exactly.");
                    continue;
                }

                // Regeneration budget exhausted: deterministic safe fallback instead of an error.
                return Complete(FallbackOutcome(StrategyReasonCode.ModelResponseInvalid, envelope, currentUserMessage));
            }

            // ---- Response Guard ----
            if (decision.AcceptResponseCandidate)
            {
                var responseVerdict = responseGuard.Validate(
                    candidate.ResponseCandidate, envelope.ResponseConstraints);
                if (!responseVerdict.IsValid)
                {
                    logger.LogWarning(
                        "AiCoach response guard rejected candidate for conversation {ConversationId}: {Detail}",
                        snapshot.ConversationId, responseVerdict.Detail);
                    return Complete(FallbackOutcome(StrategyReasonCode.ResponseInvalid, envelope, currentUserMessage));
                }
            }

            // ---- ProposalSet Guard (only when Post-Policy accepted the proposal path) ----
            IReadOnlyList<Domain.Proposals.TaskProposal>? acceptedProposals = null;
            var finalStrategy = decision.FinalStrategy;
            var reasonCode = decision.ReasonCode;
            var fallbackUsed = decision.DecisionType == StrategyDecisionType.Downgraded;

            if (decision.AcceptProposalSetCandidate && candidate.ProposalSetCandidate is not null)
            {
                var verdict = proposalSetGuard.Validate(
                    candidate.ProposalSetCandidate, snapshot, envelope.ProposalConstraints, request.TimeZoneId);
                if (verdict.IsValid)
                {
                    acceptedProposals = verdict.Proposals;
                }
                else
                {
                    // Invalid card: the whole candidate set is discarded and the turn downgrades
                    // to a deterministic clarifying fallback (v3 §15) — never a partial card.
                    logger.LogWarning(
                        "AiCoach proposal set rejected for conversation {ConversationId}: {Detail}",
                        snapshot.ConversationId, verdict.Detail);
                    finalStrategy = ConversationStrategy.AskClarifyingQuestion;
                    reasonCode = StrategyReasonCode.ProposalSetInvalid;
                    fallbackUsed = true;
                }
            }

            var text = fallbackUsed
                ? FallbackCatalog.For(reasonCode, currentUserMessage)
                : candidate.ResponseCandidate.Text;

            var question = fallbackUsed
                ? (finalStrategy.AsksQuestion() ? text : null)
                : QuestionOf(candidate.ResponseCandidate);

            logger.LogInformation(
                "AiCoach turn decided: conversation {ConversationId} candidate={Candidate} final={Final} decision={Decision} reason={Reason} proposals={Proposals} fallback={Fallback}",
                snapshot.ConversationId, candidate.StrategyCandidate, finalStrategy, decision.DecisionType,
                reasonCode, acceptedProposals?.Count ?? 0, fallbackUsed);

            return Complete(new ValidatedTurnOutcome(
                finalStrategy,
                decision.DecisionType,
                reasonCode,
                text,
                question,
                acceptedProposals,
                fallbackUsed));
        }

        logger.LogWarning(
            "Model turn hit iteration limit for conversation {ConversationId} (effect {EffectId})",
            snapshot.ConversationId, request.EffectId);
        return Fail(ModelTurnCompletionReason.IterationLimitExceeded);

        ModelTurnRunResult Fail(ModelTurnCompletionReason reason) =>
            new(reason, null, inputTokens, outputTokens, totalTokens);

        ModelTurnRunResult Complete(ValidatedTurnOutcome outcome) =>
            new(ModelTurnCompletionReason.Completed, outcome, inputTokens, outputTokens, totalTokens);
    }

    private static void AppendCorrection(List<GatewayMessage> transcript, string? rawOutput, string note)
    {
        transcript.Add(new GatewayAssistantMessage(rawOutput ?? string.Empty, []));
        transcript.Add(new GatewayUserMessage(note));
    }

    private static ValidatedTurnOutcome FallbackOutcome(
        StrategyReasonCode reason,
        StrategyEnvelope envelope,
        string currentUserMessage)
    {
        var strategy = envelope.AllowedStrategies.Contains(ConversationStrategy.ContinueListening)
            ? ConversationStrategy.ContinueListening
            : envelope.AllowedStrategies.First();
        var text = FallbackCatalog.For(reason, currentUserMessage);
        return new ValidatedTurnOutcome(
            strategy,
            StrategyDecisionType.Downgraded,
            reason,
            text,
            Question: null,
            AcceptedProposals: null,
            FallbackUsed: true);
    }

    private static string? QuestionOf(AssistantResponseCandidate response) => response switch
    {
        GentleQuestionResponse r => r.Question,
        ClarifyingQuestionResponse r => r.Question,
        GoalChoiceResponse r => r.Question,
        _ => null,
    };
}
