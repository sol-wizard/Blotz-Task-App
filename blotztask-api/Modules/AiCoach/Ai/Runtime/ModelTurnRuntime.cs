using BlotzTask.Modules.AiCoach.Ai.Contracts;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Guards;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Planning;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Domain.Support;
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
    int TotalTokens,
    int ModelCallCount = 0,
    int SchemaCorrectionCount = 0,
    int RegenerationCount = 0,
    int ProposalRegenerationCount = 0);

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
    IPlanningAuthorityCalculator planningAuthorityCalculator,
    ISupportPolicyCalculator supportPolicyCalculator,
    IDeterministicProposalGenerator proposalGenerator,
    IResponseGuard responseGuard,
    IProposalSetGuard proposalSetGuard,
    IProposalSetMutationHandler proposalSetMutationHandler,
    IOptions<AiCoachModuleOptions> options,
    ILogger<ModelTurnRuntime> logger) : IModelTurnRuntime
{
    // Compatibility constructor for existing deterministic tests and non-DI callers. The
    // production container injects the registered mutation handler through the primary seam.
    public ModelTurnRuntime(
        IModelGateway gateway,
        IModelContextBuilder contextBuilder,
        IConversationPrePolicy prePolicy,
        IConversationPostPolicy postPolicy,
        IEvidenceGuard evidenceGuard,
        IPlanningAuthorityCalculator planningAuthorityCalculator,
        ISupportPolicyCalculator supportPolicyCalculator,
        IDeterministicProposalGenerator proposalGenerator,
        IResponseGuard responseGuard,
        IProposalSetGuard proposalSetGuard,
        IOptions<AiCoachModuleOptions> options,
        ILogger<ModelTurnRuntime> logger)
        : this(
            gateway,
            contextBuilder,
            prePolicy,
            postPolicy,
            evidenceGuard,
            planningAuthorityCalculator,
            supportPolicyCalculator,
            proposalGenerator,
            responseGuard,
            proposalSetGuard,
            new ProposalSetMutationHandler(),
            options,
            logger)
    {
    }

    public async Task<ModelTurnRunResult> ExecuteAsync(ModelTurnRequest request, CancellationToken cancellationToken)
    {
        var turnStarted = Stopwatch.GetTimestamp();
        var limits = options.Value;
        var snapshot = request.Snapshot;
        var envelope = prePolicy.Build(snapshot, request.Mode);
        var currentUser = request.RecentMessages
            .LastOrDefault(m => m.Role == ConversationMessageRole.User);
        var currentUserMessage = currentUser?.Content ?? string.Empty;
        var previousAssistantStrategy = request.RecentMessages
            .LastOrDefault(m => m.Role == ConversationMessageRole.Assistant)?.Strategy;

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

        (VerifiedPlanningContext Planning, PlanningAuthority Authority, SupportDecision? Support)? repairContext = null;
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
            // Payload repairs may not reinterpret the user's request or expand authority.
            verifiedPlanning = repairContext?.Planning ?? verifiedPlanning;
            var planningAuthority = repairContext?.Authority ?? planningAuthorityCalculator.Calculate(new PlanningAuthorityContext(
                snapshot,
                verifiedPlanning,
                request.Mode.Policy.Planning));
            logger.LogInformation(
                "AiCoach.PlanningAuthority.Completed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} IsBlocked={IsBlocked} CanGenerateProposal={CanGenerateProposal} CanAskClarifyingQuestion={CanAskClarifyingQuestion} ReasonCodes={ReasonCodes} AllowedAssumptions={AllowedAssumptions} ActiveItemCount={ActiveItemCount} HasOpenQuestion={HasOpenQuestion}",
                snapshot.ConversationId,
                request.EffectId,
                iterations,
                planningAuthority.IsBlocked,
                planningAuthority.CanGenerateProposal,
                planningAuthority.CanAskClarifyingQuestion,
                string.Join(",", planningAuthority.Reasons),
                string.Join(",", planningAuthority.AllowedAssumptions),
                snapshot.ActivePlanningIntent?.Items.Count ?? 0,
                snapshot.OpenQuestion is not null);

            var supportDecision = repairContext?.Support ?? (request.Mode.SupportPolicy is null
                ? null
                : supportPolicyCalculator.Calculate(new SupportPolicyContext(
                    snapshot,
                    verifiedPlanning.SupportRequest,
                    previousAssistantStrategy,
                    currentUser?.Id,
                    request.Mode.SupportPolicy)));
            if (supportDecision is not null)
            {
                logger.LogInformation(
                    "AiCoach.SupportDecision.Completed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} CurrentRequest={CurrentRequest} StoredPreference={StoredPreference} PreviousAssistantStrategy={PreviousAssistantStrategy} AllowedMoves={AllowedMoves} ReasonCodes={ReasonCodes} HasPreferenceUpdate={HasPreferenceUpdate} ClearPreference={ClearPreference}",
                    snapshot.ConversationId,
                    request.EffectId,
                    iterations,
                    verifiedPlanning.SupportRequest?.Kind,
                    snapshot.CompanionContext?.ExplicitPreference?.Kind,
                    previousAssistantStrategy,
                    string.Join(",", supportDecision.AllowedMoves),
                    string.Join(",", supportDecision.Reasons),
                    supportDecision.PreferenceUpdate is not null,
                    supportDecision.ClearPreference);
            }

            var proposalMutationVerdict = candidate.ProposalSetMutationCandidate is null
                ? null
                : proposalSetMutationHandler.Evaluate(
                    snapshot.CurrentProposalSet,
                    candidate.ProposalSetMutationCandidate,
                    currentUserMessage,
                    envelope.ProposalConstraints.MaxProposals);
            if (proposalMutationVerdict is not null)
            {
                logger.LogInformation(
                    "AiCoach.ProposalMutation.Completed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} Readiness={Readiness} Reason={Reason} AddedCount={AddedCount} UpdatedCount={UpdatedCount} RemovedCount={RemovedCount} ResultingCount={ResultingCount} Detail={Detail}",
                    snapshot.ConversationId,
                    request.EffectId,
                    iterations,
                    proposalMutationVerdict.Readiness,
                    proposalMutationVerdict.Reason,
                    proposalMutationVerdict.Summary?.AddedCount ?? 0,
                    proposalMutationVerdict.Summary?.UpdatedCount ?? 0,
                    proposalMutationVerdict.Summary?.RemovedCount ?? 0,
                    proposalMutationVerdict.Summary?.ResultingItemCount,
                    proposalMutationVerdict.Detail);
            }

            var policyContext = new PolicyContext(
                snapshot, envelope, candidate, request.Mode, verifiedPlanning, planningAuthority,
                supportDecision, proposalMutationVerdict);
            var decision = postPolicy.Decide(policyContext);

            if (decision.AcceptResponseCandidate)
            {
                var verdict = responseGuard.Validate(candidate.ResponseCandidate, envelope.ResponseConstraints);
                logger.LogInformation(
                    "AiCoach.ResponseGuard.Completed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} IsValid={IsValid} GuardDetail={GuardDetail}",
                    snapshot.ConversationId, request.EffectId, iterations, verdict.IsValid, verdict.Detail);
                if (!verdict.IsValid)
                    decision = postPolicy.Decide(policyContext with
                    {
                        Failure = new CandidateValidationFailure(CandidateFailureKind.Response, verdict.Detail!),
                    });
            }

            IReadOnlyList<Domain.Proposals.TaskProposal>? acceptedProposals = null;
            if (decision.AcceptProposalSetCandidate && candidate.ProposalSetCandidate is not null)
            {
                var verdict = proposalSetGuard.Validate(
                    candidate.ProposalSetCandidate, snapshot, envelope.ProposalConstraints, request.TimeZoneId);
                logger.LogInformation(
                    "AiCoach.ProposalGuard.Completed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} Source={Source} IsValid={IsValid} GuardDetail={GuardDetail}",
                    snapshot.ConversationId, request.EffectId, iterations, "Model", verdict.IsValid, verdict.Detail);
                if (verdict.IsValid)
                    acceptedProposals = verdict.Proposals;
                else
                    decision = postPolicy.Decide(policyContext with
                    {
                        Failure = new CandidateValidationFailure(CandidateFailureKind.Proposal, verdict.Detail!),
                    });
            }

            var acceptedMutation = decision.AcceptProposalSetMutationCandidate
                && proposalMutationVerdict is { IsReady: true }
                    ? proposalMutationVerdict
                    : null;

            logger.LogInformation(
                "AiCoach.PostPolicy.Completed ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} SuggestedStrategy={SuggestedStrategy} FinalStrategy={FinalStrategy} Decision={Decision} ReasonCode={ReasonCode} AcceptResponse={AcceptResponse} AcceptProposal={AcceptProposal} HasRegeneration={HasRegeneration} FallbackAction={FallbackAction}",
                snapshot.ConversationId, request.EffectId, iterations, candidate.SuggestedAction,
                decision.FinalStrategy, decision.DecisionType, decision.ReasonCode,
                decision.AcceptResponseCandidate, decision.AcceptProposalSetCandidate,
                decision.Regeneration is not null, decision.Fallback?.Action);

            if (decision.DecisionType == StrategyDecisionType.RequiresRegeneration
                && decision.Regeneration is { } directive
                && regenerations + proposalRegenerations < limits.MaxRegenerationAttempts
                && iterations < limits.MaxModelIterations)
            {
                // Field names describe the repair protocol; no product reason code selects a path.
                if (directive.RequiredFields.Contains("proposalSet"))
                    proposalRegenerations++;
                else
                    regenerations++;
                if (!verifiedPlanning.Evidence.HasInvalidClaims)
                    repairContext = (verifiedPlanning, planningAuthority, supportDecision);
                logger.LogInformation(
                    "AiCoach.Regeneration.Requested ConversationId={ConversationId} EffectId={EffectId} Attempt={Attempt} RequiredStrategy={RequiredStrategy} RequiredFields={RequiredFields}",
                    snapshot.ConversationId, request.EffectId, iterations, directive.RequiredStrategy,
                    string.Join(",", directive.RequiredFields));
                AppendCorrection(transcript, completion.AssistantText, BuildRegenerationInstruction(directive));
                continue;
            }

            if (!decision.AcceptResponseCandidate)
            {
                return Complete(FallbackOutcome(
                    decision.ReasonCode, decision, snapshot, verifiedPlanning, planningAuthority,
                    supportDecision, request.Mode.Mode, currentUser?.Id, verifiedPlanning.Disposition,
                    currentUserMessage, request.TimeZoneId, request.UserLocalNow,
                    request.Mode.Policy.ProposalGeneration, envelope.ProposalConstraints,
                    request.EffectId, iterations, proposalRegenerations));
            }

            var assistantMessage = acceptedMutation?.Summary is { } mutationSummary
                ? ProposalSetMutationResponseProjector.Render(mutationSummary, currentUserMessage)
                : candidate.ResponseCandidate.Text;

            return Complete(new ValidatedTurnOutcome(
                decision.FinalStrategy,
                decision.DecisionType,
                decision.ReasonCode,
                assistantMessage,
                QuestionOf(candidate.ResponseCandidate),
                acceptedProposals,
                FallbackUsed: false,
                PlanningIntentUpdate: PlanningStateRules.BuildPlanningIntentUpdate(
                    snapshot, verifiedPlanning, planningAuthority, currentUser?.Id,
                    acceptedProposals is not null, request.Mode.Mode,
                    planningQuestion: decision.FinalStrategy is ConversationStrategy.AskClarifyingQuestion
                        or ConversationStrategy.AskUserToChooseGoal),
                QuestionTopic: QuestionTopicOf(candidate.ResponseCandidate),
                ClarificationResolution: ToResolution(verifiedPlanning.Disposition),
                SupportPreferenceUpdate: supportDecision?.PreferenceUpdate,
                ClearSupportPreference: supportDecision?.ClearPreference ?? false,
                AcceptedProposalSetMutation: acceptedMutation));
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
            return new ModelTurnRunResult(
                reason,
                null,
                inputTokens,
                outputTokens,
                totalTokens,
                iterations,
                schemaCorrections,
                regenerations,
                proposalRegenerations);
        }

        ModelTurnRunResult Complete(ValidatedTurnOutcome outcome)
        {
            // Fallback and generated introductions have the same response limits as model text.
            // Failure rejects the complete outcome; no message, card or preference is committed.
            if (outcome.FallbackUsed)
            {
                AssistantResponseCandidate response = outcome.FinalStrategy switch
                {
                    ConversationStrategy.ShowProposalSet => new ProposalIntroductionResponse(outcome.AssistantMessage),
                    ConversationStrategy.UpdateProposalSet => new ProposalUpdateResponse(outcome.AssistantMessage),
                    _ => new ListeningResponse(outcome.AssistantMessage),
                };
                var verdict = responseGuard.Validate(response, envelope.ResponseConstraints);
                if (!verdict.IsValid)
                {
                    logger.LogWarning("AiCoach.FallbackResponse.Invalid GuardDetail={GuardDetail}", verdict.Detail);
                    return Fail(ModelTurnCompletionReason.InvalidModelResponse);
                }
            }

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
                ModelTurnCompletionReason.Completed,
                outcome,
                inputTokens,
                outputTokens,
                totalTokens,
                iterations,
                schemaCorrections,
                regenerations,
                proposalRegenerations);
        }
    }

    private static void AppendCorrection(List<GatewayMessage> transcript, string? rawOutput, string note)
    {
        transcript.Add(new GatewayAssistantMessage(rawOutput ?? string.Empty, []));
        transcript.Add(new GatewaySystemMessage(note));
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
        PlanningAuthority planningAuthority,
        SupportDecision? supportDecision,
        AiCoachMode mode,
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
                planningAuthority,
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
                PlanningIntentUpdate: PlanningStateRules.BuildPlanningIntentUpdate(
                    snapshot, verifiedPlanning, planningAuthority, currentMessageId,
                    proposalAccepted: true, mode: mode),
                ClarificationResolution: resolution,
                SupportPreferenceUpdate: supportDecision?.PreferenceUpdate,
                ClearSupportPreference: supportDecision?.ClearPreference ?? false);
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
            PlanningIntentUpdate: PlanningStateRules.BuildPlanningIntentUpdate(
                snapshot, verifiedPlanning, planningAuthority, currentMessageId,
                proposalAccepted: false, mode: mode,
                planningQuestion: strategy is ConversationStrategy.AskClarifyingQuestion
                    or ConversationStrategy.AskUserToChooseGoal),
            ClarificationResolution: resolution,
            SupportPreferenceUpdate: supportDecision?.PreferenceUpdate,
            ClearSupportPreference: supportDecision?.ClearPreference ?? false);
    }

    private static string BuildRegenerationInstruction(RegenerationDirective directive)
    {
        var fields = string.Join(", ", directive.RequiredFields);
        var assumptions = directive.AllowedAssumptions.Count == 0
            ? "none"
            : string.Join(", ", directive.AllowedAssumptions);
        return $"Return suggestedAction '{directive.RequiredStrategy.ToWireValue()}'. "
               + $"Correct these fields: {fields}. Allowed assumptions: {assumptions}. "
               + "Keep interpretation unchanged; only the listed payload fields and required strategy may change. "
               + "Return the complete schema required by this protocol; repeated interpretation cannot expand authority. "
               + $"Validation detail: {directive.ValidationDetail ?? "none"}.";
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
