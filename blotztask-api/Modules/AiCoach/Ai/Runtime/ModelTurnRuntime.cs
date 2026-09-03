using BlotzTask.Modules.AiCoach.Ai.Contracts;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Guards;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;
using System.Diagnostics;
using System.Text.Json;

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
    IPlanningReadinessCalculator planningReadinessCalculator,
    IDeterministicProposalGenerator proposalGenerator,
    IResponseGuard responseGuard,
    IProposalSetGuard proposalSetGuard,
    IOptions<AiCoachModuleOptions> options,
    ILogger<ModelTurnRuntime> logger) : IModelTurnRuntime
{
    public async Task<ModelTurnRunResult> ExecuteAsync(ModelTurnRequest request, CancellationToken cancellationToken)
    {
        var turnStarted = Stopwatch.GetTimestamp();
        var limits = options.Value;
        var snapshot = request.Snapshot;
        var envelope = prePolicy.Build(snapshot, request.Mode);
        var currentUser = request.RecentMessages
            .LastOrDefault(m => m.Role == ConversationMessageRole.User);
        var currentUserMessage = currentUser?.Content ?? string.Empty;

        logger.LogInformation(
            "AiCoach.ModelTurn.Started ConversationId={ConversationId} EffectId={EffectId} ConversationVersion={ConversationVersion} Mode={Mode} Phase={Phase} RuleVersion={RuleVersion} PolicyVersion={PolicyVersion} PromptVersion={PromptVersion} ProtocolVersion={ProtocolVersion} MaxIterations={MaxIterations} UserMessage={UserMessage}",
            snapshot.ConversationId,
            request.EffectId,
            snapshot.Version,
            snapshot.Mode,
            snapshot.Phase,
            snapshot.RuntimeVersions.RuleVersion,
            snapshot.RuntimeVersions.PolicyVersion,
            snapshot.RuntimeVersions.PromptVersion,
            snapshot.RuntimeVersions.ProtocolVersion,
            limits.MaxModelIterations,
            currentUserMessage);

        var context = contextBuilder.Build(new ModelContextRequest(
            snapshot, request.Mode, envelope, request.RecentMessages, request.TimeZoneId, request.UserLocalNow));

        // Corrections/regenerations extend this transcript so the model sees what it got wrong.
        var transcript = new List<GatewayMessage>(context.Transcript);

        var iterations = 0;
        var schemaCorrections = 0;
        var regenerations = 0;
        var proposalRegenerations = 0;
        int inputTokens = 0, outputTokens = 0, totalTokens = 0;

        while (iterations < limits.MaxModelIterations)
        {
            iterations++;
            var modelCallStarted = Stopwatch.GetTimestamp();

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
            catch (OperationCanceledException ex) when (cancellationToken.IsCancellationRequested)
            {
                logger.LogWarning(
                    ex,
                    "AiCoach.ModelCall.Failed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} Result={Result} ExceptionMessage={ExceptionMessage}",
                    snapshot.ConversationId,
                    request.EffectId,
                    iterations,
                    ModelTurnCompletionReason.Cancelled,
                    ex.Message);
                return Fail(ModelTurnCompletionReason.Cancelled);
            }
            catch (OperationCanceledException ex)
            {
                logger.LogWarning(
                    ex,
                    "AiCoach.ModelCall.Failed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} Result={Result} ExceptionMessage={ExceptionMessage}",
                    snapshot.ConversationId,
                    request.EffectId,
                    iterations,
                    ModelTurnCompletionReason.TimedOut,
                    ex.Message);
                return Fail(ModelTurnCompletionReason.TimedOut);
            }

            inputTokens += completion.InputTokens;
            outputTokens += completion.OutputTokens;
            totalTokens += completion.TotalTokens;

            logger.LogInformation(
                "AiCoach.ModelCall.Completed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} FinishReason={FinishReason} ElapsedMs={ElapsedMs} InputTokens={InputTokens} OutputTokens={OutputTokens} TotalTokens={TotalTokens} RawModelOutput={RawModelOutput}",
                snapshot.ConversationId,
                request.EffectId,
                iterations,
                completion.FinishReason,
                Stopwatch.GetElapsedTime(modelCallStarted).TotalMilliseconds,
                completion.InputTokens,
                completion.OutputTokens,
                completion.TotalTokens,
                completion.AssistantText);

            if (completion.FinishReason == ModelFinishReason.ContentFilter)
                return Fail(ModelTurnCompletionReason.ContentFiltered);

            // ---- Model Output Schema Guard (one correction attempt, v3 §21) ----
            var parsed = ModelTurnCandidateContract.Parse(completion.AssistantText);
            logger.LogInformation(
                "AiCoach.SchemaValidation.Completed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} Schema={Schema} IsValid={IsValid} CorrectionAttempt={CorrectionAttempt} ErrorDetail={ErrorDetail}",
                snapshot.ConversationId,
                request.EffectId,
                iterations,
                ModelTurnCandidateContract.ResponseFormatName,
                parsed.IsSuccess,
                schemaCorrections + (parsed.IsSuccess ? 0 : 1),
                parsed.Error);
            if (!parsed.IsSuccess)
            {
                schemaCorrections++;
                if (schemaCorrections > limits.MaxSchemaCorrectionAttempts || iterations >= limits.MaxModelIterations)
                    return Fail(ModelTurnCompletionReason.InvalidModelResponse);

                logger.LogWarning(
                    "AiCoach.SchemaCorrection.Requested ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} CorrectionAttempt={CorrectionAttempt} ErrorDetail={ErrorDetail} RawModelOutput={RawModelOutput}",
                    snapshot.ConversationId,
                    request.EffectId,
                    iterations,
                    schemaCorrections,
                    parsed.Error,
                    completion.AssistantText);
                AppendCorrection(transcript, completion.AssistantText,
                    $"[system] Your output was invalid: {parsed.Error} Respond again following the required format exactly.");
                continue;
            }

            var candidate = parsed.Candidate!;

            // ---- Evidence Guard -> Post-Policy ----
            var verifiedPlanning = evidenceGuard.Verify(candidate.Interpretation, currentUserMessage);
            logger.LogInformation(
                "AiCoach.EvidenceValidation.Completed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} SubmittedClaims={SubmittedClaims} VerifiedClaims={VerifiedClaims} InvalidClaims={InvalidClaims} VerifiedItemCount={VerifiedItemCount} VerifiedConstraintCount={VerifiedConstraintCount} Disposition={Disposition} IssueCodes={IssueCodes} SubmittedPlanningItems={SubmittedPlanningItems} SubmittedConstraints={SubmittedConstraints} SubmittedDisposition={SubmittedDisposition} VerifiedPlanningItems={VerifiedPlanningItems} VerifiedConstraints={VerifiedConstraints}",
                snapshot.ConversationId,
                request.EffectId,
                iterations,
                verifiedPlanning.Evidence.SubmittedClaims,
                verifiedPlanning.Evidence.VerifiedClaims,
                verifiedPlanning.Evidence.Issues.Count,
                verifiedPlanning.Items.Count,
                verifiedPlanning.Constraints.Count,
                verifiedPlanning.Disposition,
                string.Join(",", verifiedPlanning.Evidence.Issues.Distinct()),
                SerializeForLog(candidate.Interpretation.PlanningItems),
                SerializeForLog(candidate.Interpretation.Constraints),
                SerializeForLog(candidate.Interpretation.Disposition),
                SerializeForLog(verifiedPlanning.Items),
                SerializeForLog(verifiedPlanning.Constraints));
            var planningDecision = planningReadinessCalculator.Calculate(new PlanningReadinessContext(
                snapshot,
                verifiedPlanning,
                request.Mode.Policy.Planning));
            logger.LogInformation(
                "AiCoach.PlanningReadiness.Completed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} Readiness={Readiness} AllowedActions={AllowedActions} ReasonCodes={ReasonCodes} AllowedAssumptions={AllowedAssumptions} ActiveItemCount={ActiveItemCount} HasOpenQuestion={HasOpenQuestion}",
                snapshot.ConversationId,
                request.EffectId,
                iterations,
                planningDecision.Readiness,
                string.Join(",", planningDecision.AllowedActions),
                string.Join(",", planningDecision.Reasons),
                string.Join(",", planningDecision.AllowedAssumptions),
                snapshot.ActivePlanningIntent?.Items.Count ?? 0,
                snapshot.OpenQuestion is not null);

            var decision = postPolicy.Decide(new PolicyContext(
                snapshot,
                envelope,
                candidate,
                request.Mode,
                verifiedPlanning,
                planningDecision));
            logger.LogInformation(
                "AiCoach.PostPolicy.Completed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} SuggestedStrategy={SuggestedStrategy} FinalStrategy={FinalStrategy} Decision={Decision} ReasonCode={ReasonCode} AcceptResponse={AcceptResponse} AcceptProposal={AcceptProposal} HasRegeneration={HasRegeneration} FallbackAction={FallbackAction} AssistantReply={AssistantReply} ProposalCandidate={ProposalCandidate}",
                snapshot.ConversationId,
                request.EffectId,
                iterations,
                candidate.SuggestedAction,
                decision.FinalStrategy,
                decision.DecisionType,
                decision.ReasonCode,
                decision.AcceptResponseCandidate,
                decision.AcceptProposalSetCandidate,
                decision.Regeneration is not null,
                decision.Fallback?.Action,
                candidate.ResponseCandidate.Text,
                SerializeForLog(candidate.ProposalSetCandidate));

            if (decision.DecisionType == StrategyDecisionType.RequiresRegeneration)
            {
                regenerations++;
                if (decision.Regeneration is not null
                    && regenerations <= limits.MaxRegenerationAttempts
                    && iterations < limits.MaxModelIterations)
                {
                    logger.LogWarning(
                        "AiCoach.Regeneration.Requested ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} RegenerationAttempt={RegenerationAttempt} ReasonCode={ReasonCode} RequiredStrategy={RequiredStrategy} RequiredFieldCount={RequiredFieldCount}",
                        snapshot.ConversationId,
                        request.EffectId,
                        iterations,
                        regenerations,
                        decision.ReasonCode,
                        decision.Regeneration.RequiredStrategy,
                        decision.Regeneration.RequiredFields.Count);
                    AppendCorrection(
                        transcript,
                        completion.AssistantText,
                        BuildRegenerationInstruction(decision.Regeneration));
                    continue;
                }

                return Complete(FallbackOutcome(
                        decision.ReasonCode,
                        decision,
                        snapshot,
                        verifiedPlanning,
                        planningDecision,
                        currentUser?.Id,
                        verifiedPlanning.Disposition,
                        currentUserMessage,
                        request.TimeZoneId,
                        request.UserLocalNow,
                        request.Mode.Policy.ProposalGeneration,
                        envelope.ProposalConstraints,
                        request.EffectId,
                        iterations,
                        proposalRegenerations));
            }

            // ---- Response Guard ----
            if (decision.AcceptResponseCandidate)
            {
                var responseVerdict = responseGuard.Validate(
                    candidate.ResponseCandidate, envelope.ResponseConstraints);
                logger.LogInformation(
                    "AiCoach.ResponseGuard.Completed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} IsValid={IsValid} ResponseType={ResponseType} ResponseText={ResponseText} GuardDetail={GuardDetail}",
                    snapshot.ConversationId,
                    request.EffectId,
                    iterations,
                    responseVerdict.IsValid,
                    candidate.ResponseCandidate.GetType().Name,
                    candidate.ResponseCandidate.Text,
                    responseVerdict.Detail);
                if (!responseVerdict.IsValid)
                {
                    return Complete(FallbackOutcome(
                        StrategyReasonCode.ResponseInvalid,
                        decision,
                        snapshot,
                        verifiedPlanning,
                        planningDecision,
                        currentUser?.Id,
                        verifiedPlanning.Disposition,
                        currentUserMessage,
                        request.TimeZoneId,
                        request.UserLocalNow,
                        request.Mode.Policy.ProposalGeneration,
                        envelope.ProposalConstraints,
                        request.EffectId,
                        iterations,
                        proposalRegenerations));
                }
            }

            // ---- ProposalSet Guard (only when Post-Policy accepted the proposal path) ----
            IReadOnlyList<Domain.Proposals.TaskProposal>? acceptedProposals = null;
            var finalStrategy = decision.FinalStrategy;
            var reasonCode = decision.ReasonCode;
            var fallbackUsed = decision.DecisionType == StrategyDecisionType.Downgraded;
            var deterministicProposalUsed = false;
            string? deterministicProposalText = null;

            if (decision.AcceptProposalSetCandidate && candidate.ProposalSetCandidate is not null)
            {
                var verdict = proposalSetGuard.Validate(
                    candidate.ProposalSetCandidate, snapshot, envelope.ProposalConstraints, request.TimeZoneId);
                logger.LogInformation(
                    "AiCoach.ProposalGuard.Completed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} Source={Source} IsValid={IsValid} SubmittedCount={SubmittedCount} AcceptedCount={AcceptedCount} RegenerationAttempt={RegenerationAttempt} ProposalCandidate={ProposalCandidate} AcceptedProposals={AcceptedProposals} GuardDetail={GuardDetail}",
                    snapshot.ConversationId,
                    request.EffectId,
                    iterations,
                    "Model",
                    verdict.IsValid,
                    candidate.ProposalSetCandidate.Proposals.Count,
                    verdict.Proposals?.Count ?? 0,
                    proposalRegenerations,
                    SerializeForLog(candidate.ProposalSetCandidate),
                    SerializeForLog(verdict.Proposals),
                    verdict.Detail);
                if (verdict.IsValid)
                {
                    acceptedProposals = verdict.Proposals;
                }
                else
                {
                    if (proposalRegenerations < limits.MaxRegenerationAttempts
                        && iterations < limits.MaxModelIterations)
                    {
                        proposalRegenerations++;
                        AppendCorrection(
                            transcript,
                            completion.AssistantText,
                            "[system] The proposal card failed server validation. Keep every verified planning item, "
                            + "use a future local time in the user's timezone, avoid the past and default overnight hours, "
                            + "and return a complete show_proposal_set with valid start/end times.");
                        continue;
                    }

                    // Invalid cards are never partially accepted. After the bounded retry, keep
                    // the verified intent and build a minimal safe card from it.
                    var generated = proposalGenerator.Generate(new ProposalGenerationContext(
                        snapshot,
                        verifiedPlanning,
                        planningDecision,
                        request.Mode.Policy.ProposalGeneration,
                        request.UserLocalNow,
                        request.TimeZoneId,
                        envelope.ProposalConstraints.MaxProposals));
                    var generatedVerdict = generated.Candidate is null
                        ? ProposalSetVerdict.Invalid("The deterministic generator produced no candidate.")
                        : proposalSetGuard.Validate(
                            generated.Candidate,
                            snapshot,
                            envelope.ProposalConstraints,
                            request.TimeZoneId);
                    logger.LogInformation(
                        "AiCoach.DeterministicProposal.Completed ConversationId={ConversationId} EffectId={EffectId} PolicyVersion={PolicyVersion} CandidateGenerated={CandidateGenerated} IsValid={IsValid} GeneratedCount={GeneratedCount} AcceptedCount={AcceptedCount} AssistantReply={AssistantReply} ProposalCandidate={ProposalCandidate} AcceptedProposals={AcceptedProposals} GuardDetail={GuardDetail}",
                        snapshot.ConversationId,
                        request.EffectId,
                        request.Mode.Policy.ProposalGeneration.Version,
                        generated.Candidate is not null,
                        generatedVerdict.IsValid,
                        generated.Candidate?.Proposals.Count ?? 0,
                        generatedVerdict.Proposals?.Count ?? 0,
                        generated.AssistantMessage,
                        SerializeForLog(generated.Candidate),
                        SerializeForLog(generatedVerdict.Proposals),
                        generatedVerdict.Detail);
                    if (generatedVerdict.IsValid)
                    {
                        acceptedProposals = generatedVerdict.Proposals;
                        deterministicProposalText = generated.AssistantMessage;
                        reasonCode = StrategyReasonCode.ProposalSetInvalid;
                        fallbackUsed = true;
                        deterministicProposalUsed = true;
                    }
                    else
                    {
                        finalStrategy = decision.Fallback?.FailureStrategy
                            ?? throw new InvalidOperationException(
                                "Post-Policy must provide a fallback plan for an accepted proposal strategy.");
                        reasonCode = StrategyReasonCode.ProposalSetInvalid;
                        fallbackUsed = true;
                    }
                }
            }

            var text = fallbackUsed
                ? deterministicProposalUsed
                    ? deterministicProposalText!
                    : FallbackCatalog.For(
                    reasonCode,
                    currentUserMessage,
                    allowQuestion: finalStrategy.AsksQuestion())
                : candidate.ResponseCandidate.Text;

            var question = fallbackUsed
                ? (finalStrategy.AsksQuestion() ? text : null)
                : QuestionOf(candidate.ResponseCandidate);
            var questionTopic = QuestionTopicOf(candidate.ResponseCandidate);
            var clarificationResolution = ToResolution(verifiedPlanning.Disposition);
            var planningIntentUpdate = BuildPlanningIntentUpdate(
                snapshot,
                verifiedPlanning,
                planningDecision,
                currentUser?.Id,
                acceptedProposals is not null);

            return Complete(new ValidatedTurnOutcome(
                finalStrategy,
                decision.DecisionType,
                reasonCode,
                text,
                question,
                acceptedProposals,
                fallbackUsed,
                planningIntentUpdate,
                questionTopic,
                clarificationResolution));
        }

        return Fail(ModelTurnCompletionReason.IterationLimitExceeded);

        ModelTurnRunResult Fail(ModelTurnCompletionReason reason)
        {
            logger.LogWarning(
                "AiCoach.ModelTurn.Failed ConversationId={ConversationId} EffectId={EffectId} CompletionReason={CompletionReason} Iterations={Iterations} SchemaCorrections={SchemaCorrections} Regenerations={Regenerations} ProposalRegenerations={ProposalRegenerations} ElapsedMs={ElapsedMs} TotalTokens={TotalTokens}",
                snapshot.ConversationId,
                request.EffectId,
                reason,
                iterations,
                schemaCorrections,
                regenerations,
                proposalRegenerations,
                Stopwatch.GetElapsedTime(turnStarted).TotalMilliseconds,
                totalTokens);
            return new ModelTurnRunResult(reason, null, inputTokens, outputTokens, totalTokens);
        }

        ModelTurnRunResult Complete(ValidatedTurnOutcome outcome)
        {
            logger.LogInformation(
                "AiCoach.ModelTurn.Completed ConversationId={ConversationId} EffectId={EffectId} FinalStrategy={FinalStrategy} Decision={Decision} ReasonCode={ReasonCode} ProposalCount={ProposalCount} FallbackUsed={FallbackUsed} HasPlanningIntentUpdate={HasPlanningIntentUpdate} ClarificationResolution={ClarificationResolution} Iterations={Iterations} SchemaCorrections={SchemaCorrections} Regenerations={Regenerations} ProposalRegenerations={ProposalRegenerations} ElapsedMs={ElapsedMs} TotalTokens={TotalTokens} AssistantReply={AssistantReply} AcceptedProposals={AcceptedProposals} PlanningIntentUpdate={PlanningIntentUpdate}",
                snapshot.ConversationId,
                request.EffectId,
                outcome.FinalStrategy,
                outcome.DecisionType,
                outcome.ReasonCode,
                outcome.AcceptedProposals?.Count ?? 0,
                outcome.FallbackUsed,
                outcome.PlanningIntentUpdate is not null,
                outcome.ClarificationResolution,
                iterations,
                schemaCorrections,
                regenerations,
                proposalRegenerations,
                Stopwatch.GetElapsedTime(turnStarted).TotalMilliseconds,
                totalTokens,
                outcome.AssistantMessage,
                SerializeForLog(outcome.AcceptedProposals),
                SerializeForLog(outcome.PlanningIntentUpdate));
            return new ModelTurnRunResult(
                ModelTurnCompletionReason.Completed, outcome, inputTokens, outputTokens, totalTokens);
        }
    }

    private static void AppendCorrection(List<GatewayMessage> transcript, string? rawOutput, string note)
    {
        transcript.Add(new GatewayAssistantMessage(rawOutput ?? string.Empty, []));
        transcript.Add(new GatewayUserMessage(note));
    }

    private static ActivePlanningIntentSnapshot? BuildPlanningIntentUpdate(
        ConversationSnapshot snapshot,
        VerifiedPlanningContext verifiedPlanning,
        PlanningDecision planningDecision,
        Guid? currentMessageId,
        bool proposalAccepted)
    {
        if (currentMessageId is null)
            return null;

        var current = snapshot.ActivePlanningIntent is
            { Status: PlanningIntentStatus.Collecting or PlanningIntentStatus.ReadyForProposal } reusable
            ? reusable
            : null;
        if (current is null && verifiedPlanning.Items.Count == 0)
            return null;

        var intentId = current?.IntentId ?? Guid.NewGuid();
        var sourceItems = verifiedPlanning.Items;
        var items = (current?.Items ?? [])
            .Concat(sourceItems.Select(item => new PlanningItemSnapshot(
                item.Text,
                item.EvidenceQuote,
                currentMessageId.Value,
                item.Kind)))
            .GroupBy(item => item.Text, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.Last())
            .ToList();
        var constraints = (current?.Constraints ?? [])
            .Concat(verifiedPlanning.Constraints.Select(constraint => new PlanningConstraintSnapshot(
                constraint.Text,
                constraint.EvidenceQuote,
                currentMessageId.Value)))
            .GroupBy(constraint => constraint.Text, StringComparer.OrdinalIgnoreCase)
            .Select(group => group.Last())
            .ToList();

        return new ActivePlanningIntentSnapshot(
            intentId,
            current?.SourceMessageId ?? currentMessageId.Value,
            items,
            constraints,
            PlanningStateRules.NextIntentStatus(
                current?.Status ?? PlanningIntentStatus.Collecting,
                planningDecision,
                proposalAccepted),
            current?.AskedTopics);
    }

    private static ClarificationResolution? ToResolution(UserTurnDisposition disposition) => disposition switch
    {
        UserTurnDisposition.Answered => ClarificationResolution.Answered,
        UserTurnDisposition.CannotProvide => ClarificationResolution.UserCannotProvide,
        UserTurnDisposition.DelegatedToCoach => ClarificationResolution.DelegatedToCoach,
        UserTurnDisposition.RejectedAction => ClarificationResolution.Superseded,
        _ => null,
    };

    private ValidatedTurnOutcome FallbackOutcome(
        StrategyReasonCode reason,
        StrategyDecision policyDecision,
        ConversationSnapshot snapshot,
        VerifiedPlanningContext verifiedPlanning,
        PlanningDecision planningDecision,
        Guid? currentMessageId,
        UserTurnDisposition disposition,
        string currentUserMessage,
        string timeZoneId,
        DateTimeOffset localNow,
        ProposalGenerationPolicy generationPolicy,
        ProposalConstraints proposalConstraints,
        Guid effectId,
        int attempt,
        int proposalRegenerationAttempt)
    {
        var strategy = policyDecision.FinalStrategy;
        var resolution = ToResolution(disposition);
        var fallback = policyDecision.Fallback
            ?? throw new InvalidOperationException("Post-Policy must provide a fallback plan.");
        var generated = fallback.Action == PolicyFallbackAction.DeterministicProposal
            ? proposalGenerator.Generate(new ProposalGenerationContext(
                snapshot,
                verifiedPlanning,
                planningDecision,
                generationPolicy,
                localNow,
                timeZoneId,
                proposalConstraints.MaxProposals))
            : null;
        var generatedVerdict = generated?.Candidate is null
            ? null
            : proposalSetGuard.Validate(
                generated.Candidate,
                snapshot,
                proposalConstraints,
                timeZoneId);
        if (fallback.Action == PolicyFallbackAction.DeterministicProposal)
        {
            logger.LogInformation(
                "AiCoach.DeterministicProposal.Completed ConversationId={ConversationId} EffectId={EffectId} PolicyVersion={PolicyVersion} CandidateGenerated={CandidateGenerated} IsValid={IsValid} GeneratedCount={GeneratedCount} AcceptedCount={AcceptedCount} AssistantReply={AssistantReply} ProposalCandidate={ProposalCandidate} AcceptedProposals={AcceptedProposals} GuardDetail={GuardDetail}",
                snapshot.ConversationId,
                effectId,
                generationPolicy.Version,
                generated?.Candidate is not null,
                generatedVerdict?.IsValid ?? false,
                generated?.Candidate?.Proposals.Count ?? 0,
                generatedVerdict?.Proposals?.Count ?? 0,
                generated?.AssistantMessage,
                SerializeForLog(generated?.Candidate),
                SerializeForLog(generatedVerdict?.Proposals),
                generatedVerdict?.Detail);
            logger.LogInformation(
                "AiCoach.ProposalGuard.Completed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} Source={Source} IsValid={IsValid} SubmittedCount={SubmittedCount} AcceptedCount={AcceptedCount} RegenerationAttempt={RegenerationAttempt} ProposalCandidate={ProposalCandidate} AcceptedProposals={AcceptedProposals} GuardDetail={GuardDetail}",
                snapshot.ConversationId,
                effectId,
                attempt,
                "DeterministicFallback",
                generatedVerdict?.IsValid ?? false,
                generated?.Candidate?.Proposals.Count ?? 0,
                generatedVerdict?.Proposals?.Count ?? 0,
                proposalRegenerationAttempt,
                SerializeForLog(generated?.Candidate),
                SerializeForLog(generatedVerdict?.Proposals),
                generatedVerdict?.Detail);
        }
        if (generatedVerdict is { IsValid: true })
        {
            return new ValidatedTurnOutcome(
                ConversationStrategy.ShowProposalSet,
                StrategyDecisionType.Downgraded,
                reason,
                generated!.AssistantMessage,
                Question: null,
                AcceptedProposals: generatedVerdict.Proposals,
                FallbackUsed: true,
                PlanningIntentUpdate: BuildPlanningIntentUpdate(
                    snapshot, verifiedPlanning, planningDecision, currentMessageId, proposalAccepted: true),
                ClarificationResolution: resolution);
        }

        strategy = fallback.FailureStrategy;
        var text = FallbackCatalog.For(reason, currentUserMessage, allowQuestion: strategy.AsksQuestion());
        return new ValidatedTurnOutcome(
            strategy,
            StrategyDecisionType.Downgraded,
            reason,
            text,
            Question: strategy.AsksQuestion() ? text : null,
            AcceptedProposals: null,
            FallbackUsed: true,
            PlanningIntentUpdate: BuildPlanningIntentUpdate(
                snapshot, verifiedPlanning, planningDecision, currentMessageId, proposalAccepted: false),
            ClarificationResolution: resolution);
    }

    private static string BuildRegenerationInstruction(RegenerationDirective directive)
    {
        var fields = string.Join(", ", directive.RequiredFields);
        var assumptions = directive.AllowedAssumptions.Count == 0
            ? "none"
            : string.Join(", ", directive.AllowedAssumptions);
        return $"[system] Return suggestedAction '{directive.RequiredStrategy.ToWireValue()}'. "
               + $"Correct these fields: {fields}. Allowed assumptions: {assumptions}.";
    }

    private static string SerializeForLog<T>(T value) => JsonSerializer.Serialize(value);

    private static string? QuestionOf(AssistantResponseCandidate response) => response switch
    {
        GentleQuestionResponse r => r.Question,
        ClarifyingQuestionResponse r => r.Question,
        GoalChoiceResponse r => r.Question,
        _ => null,
    };

    private static ClarificationTopic? QuestionTopicOf(AssistantResponseCandidate response) => response switch
    {
        GentleQuestionResponse r => r.Topic,
        ClarifyingQuestionResponse r => r.Topic,
        GoalChoiceResponse r => r.Topic,
        _ => null,
    };

}
