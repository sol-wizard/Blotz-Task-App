using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Domain.Kernel;

file static class InteractivePhases
{
    public static readonly IReadOnlySet<ConversationPhase> All = new HashSet<ConversationPhase>
    {
        ConversationPhase.Conversing,
        ConversationPhase.ActionPreparing,
        ConversationPhase.ActionPending,
        ConversationPhase.FollowUp,
    };
}

file static class Facts
{
    public static IReadOnlySet<ConversationFact> Of(params ConversationFact[] facts) =>
        new HashSet<ConversationFact>(facts);
}

/// <summary>
/// User sent a chat message (v3 §7.5 baseline row 1-3 entry). Valid from every interactive
/// phase; always results in one model-turn effect with generation marked Running — the phase
/// itself does not change until the model result arrives (generation is orthogonal, §6).
/// </summary>
public sealed class UserMessageReceivedHandler : IConversationTransitionHandler<UserMessageReceived>
{
    public IReadOnlySet<ConversationPhase> SupportedPhases => InteractivePhases.All;

    public StateTransition Reduce(
        ConversationSnapshot current,
        UserMessageReceived input,
        AiCoachModeDefinition mode)
    {
        // One Running Model Effect per conversation (v3 §19): the second open message is
        // rejected with the latest snapshot — v1 has no queueing and no auto-cancel.
        if (current.GenerationStatus == GenerationStatus.Running)
            return StateTransition.Rejected(TransitionRejection.TurnInProgress);

        // Quota exhaustion is terminal for model calls this month; other block reasons are
        // retryable by sending again.
        if (current.GenerationStatus == GenerationStatus.Blocked && current.BlockedReason == BlockedReason.Quota)
            return StateTransition.Rejected(TransitionRejection.GenerationBlocked);

        // A handled card starts a fresh conversing round (v3 §7.5: FollowUp -> Conversing).
        var nextPhase = current.Phase == ConversationPhase.FollowUp
            ? ConversationPhase.Conversing
            : current.Phase;

        return StateTransition.MoveTo(
            nextPhase,
            GenerationStatus.Running,
            ActionSets.None,
            addFacts: Facts.Of(ConversationFact.HasRunningModelEffect),
            mutations: [new AppendUserMessageMutation(input.MessageId, input.Content)],
            effects: [new GenerateModelTurnEffectRequest(input.MessageId)]);
    }
}

/// <summary>
/// A model turn finished and survived Post-Policy + Guards. The transition follows the FINAL
/// strategy in the validated outcome: ShowProposalSet creates the Pending ProposalSet and moves
/// to ActionPending; question strategies track the OpenQuestion in ActionPreparing; everything
/// else is a plain reply that leaves the phase alone.
/// </summary>
public sealed class ModelTurnCompletedHandler : IConversationTransitionHandler<ModelTurnCompleted>
{
    public IReadOnlySet<ConversationPhase> SupportedPhases => InteractivePhases.All;

    public StateTransition Reduce(
        ConversationSnapshot current,
        ModelTurnCompleted input,
        AiCoachModeDefinition mode)
    {
        // Late/duplicate results must not overwrite newer state (v3 §7.4).
        if (current.GenerationStatus != GenerationStatus.Running)
            return StateTransition.Rejected(TransitionRejection.StaleEffectResult);

        var outcome = input.Outcome;

        if (outcome.FinalStrategy == ConversationStrategy.ShowProposalSet && outcome.AcceptedProposals is { Count: > 0 })
        {
            // Defense in depth: the guards already refuse a second card, and the Kernel
            // independently refuses to accept one (v3 §13.8 hard invariant).
            if (current.CurrentProposalSet is { IsOpen: true })
                return StateTransition.Rejected(TransitionRejection.PendingProposalSetAlreadyExists);

            return StateTransition.MoveTo(
                ConversationPhase.ActionPending,
                GenerationStatus.Idle,
                ActionSets.ForPendingSet(outcome.AcceptedProposals.Count == 1),
                addFacts: Facts.Of(ConversationFact.HasPendingProposalSet),
                removeFacts: Facts.Of(ConversationFact.HasRunningModelEffect, ConversationFact.HasOpenQuestion),
                mutations:
                [
                    new AppendAssistantMessageMutation(outcome.AssistantMessage),
                    new CreateProposalSetMutation(outcome.AcceptedProposals),
                    new ClearOpenQuestionMutation(),
                ],
                events: [new ProposalSetCreated(outcome.AcceptedProposals.Count)]);
        }

        // A question strategy without a card on screen enters/stays in ActionPreparing and
        // records the question so rounds are counted (asked-twice rule).
        if (outcome.FinalStrategy.AsksQuestion()
            && current.Phase != ConversationPhase.ActionPending
            && !string.IsNullOrWhiteSpace(outcome.Question))
        {
            return StateTransition.MoveTo(
                ConversationPhase.ActionPreparing,
                GenerationStatus.Idle,
                ActionSets.ChatOnly,
                addFacts: Facts.Of(ConversationFact.HasOpenQuestion),
                removeFacts: Facts.Of(ConversationFact.HasRunningModelEffect),
                mutations:
                [
                    new AppendAssistantMessageMutation(outcome.AssistantMessage),
                    new SetOpenQuestionMutation(outcome.Question!),
                ]);
        }

        // Plain reply: the phase and any pending card stay untouched.
        return StateTransition.MoveTo(
            current.Phase,
            GenerationStatus.Idle,
            current.Phase == ConversationPhase.ActionPending
                ? ActionSets.ForPendingSet(current.CurrentProposalSet)
                : ActionSets.ChatOnly,
            removeFacts: Facts.Of(ConversationFact.HasRunningModelEffect),
            mutations: [new AppendAssistantMessageMutation(outcome.AssistantMessage)]);
    }
}

/// <summary>
/// Model turn failed. Quota / content filter / model outage set GenerationStatus = Blocked with
/// a reason — never a fake conversation phase (v3 §6). Transient errors return to Idle so the
/// user can retry by sending again.
/// </summary>
public sealed class ModelTurnFailedHandler : IConversationTransitionHandler<ModelTurnFailed>
{
    public IReadOnlySet<ConversationPhase> SupportedPhases => InteractivePhases.All;

    public StateTransition Reduce(
        ConversationSnapshot current,
        ModelTurnFailed input,
        AiCoachModeDefinition mode)
    {
        if (current.GenerationStatus != GenerationStatus.Running)
            return StateTransition.Rejected(TransitionRejection.StaleEffectResult);

        var (generationStatus, blockedReason) = input.ErrorCode switch
        {
            AiGenerationErrorCode.QuotaExceeded => (GenerationStatus.Blocked, BlockedReason.Quota),
            AiGenerationErrorCode.ContentFiltered => (GenerationStatus.Blocked, BlockedReason.ContentFiltered),
            AiGenerationErrorCode.ModelUnavailable => (GenerationStatus.Blocked, BlockedReason.ModelUnavailable),
            AiGenerationErrorCode.ConfigurationError => (GenerationStatus.Blocked, BlockedReason.ConfigurationError),
            _ => (GenerationStatus.Idle, BlockedReason.None),
        };

        var actions = blockedReason == BlockedReason.Quota
            ? ActionSets.None
            : current.Phase == ConversationPhase.ActionPending
                ? ActionSets.ForPendingSet(current.CurrentProposalSet)
                : ActionSets.ChatOnly;

        return StateTransition.MoveTo(
            current.Phase,
            generationStatus,
            actions,
            blockedReason: blockedReason,
            addFacts: generationStatus == GenerationStatus.Blocked
                ? Facts.Of(ConversationFact.HasBlockedGeneration)
                : new HashSet<ConversationFact>(),
            removeFacts: Facts.Of(ConversationFact.HasRunningModelEffect),
            events: blockedReason == BlockedReason.Quota ? [new QuotaBlocked()] : []);
    }
}

/// <summary>
/// User confirmed the current proposal set (start_now / add_to_task_list). Snapshot-level checks
/// only — field validation already happened in the Application layer (v3 §18). Moves the set to
/// Processing and requests the persistence effect.
/// </summary>
public sealed class ConfirmProposalSetRequestedHandler : IConversationTransitionHandler<ConfirmProposalSetRequested>
{
    public IReadOnlySet<ConversationPhase> SupportedPhases { get; } = new HashSet<ConversationPhase>
    {
        ConversationPhase.ActionPending,
    };

    public StateTransition Reduce(
        ConversationSnapshot current,
        ConfirmProposalSetRequested input,
        AiCoachModeDefinition mode)
    {
        if (current.GenerationStatus == GenerationStatus.Running)
            return StateTransition.Rejected(TransitionRejection.TurnInProgress);

        if (current.CurrentProposalSet is null || current.CurrentProposalSet.Id != input.ProposalSetId)
            return StateTransition.Rejected(TransitionRejection.ProposalSetNotCurrent);

        if (current.CurrentProposalSet.Status is not (ProposalSetStatus.Pending or ProposalSetStatus.PartiallyFailed))
            return StateTransition.Rejected(TransitionRejection.InvalidPhase);

        if (!current.AllowedActions.Contains(input.Action))
            return StateTransition.Rejected(TransitionRejection.ActionNotAllowed);

        // A focus timer is for one task: start_now is only valid when the card (after the
        // user's edits) holds exactly one.
        if (input.Action == ConversationAction.StartNow && !input.Validated.IsSingle)
            return StateTransition.Rejected(TransitionRejection.ActionNotAllowed);

        return StateTransition.MoveTo(
            ConversationPhase.ActionPending,
            GenerationStatus.Idle,
            ActionSets.None,
            addFacts: Facts.Of(ConversationFact.HasProcessingProposalSet),
            removeFacts: Facts.Of(ConversationFact.HasPendingProposalSet),
            mutations:
            [
                new ReplaceProposalsMutation(input.ProposalSetId, input.Validated.Proposals),
                new UpdateProposalSetStatusMutation(input.ProposalSetId, ProposalSetStatus.Processing),
            ],
            effects: [new PersistProposalSetEffectRequest(input.ProposalSetId, input.Action, input.Validated)]);
    }
}

/// <summary>
/// User rejected the set: terminal Rejected, current set cleared, phase FollowUp (v3 §7.5).
/// No task is created and no new card is auto-generated.
/// </summary>
public sealed class RejectProposalSetRequestedHandler : IConversationTransitionHandler<RejectProposalSetRequested>
{
    public IReadOnlySet<ConversationPhase> SupportedPhases { get; } = new HashSet<ConversationPhase>
    {
        ConversationPhase.ActionPending,
    };

    public StateTransition Reduce(
        ConversationSnapshot current,
        RejectProposalSetRequested input,
        AiCoachModeDefinition mode)
    {
        if (current.GenerationStatus == GenerationStatus.Running)
            return StateTransition.Rejected(TransitionRejection.TurnInProgress);

        if (current.CurrentProposalSet is null || current.CurrentProposalSet.Id != input.ProposalSetId)
            return StateTransition.Rejected(TransitionRejection.ProposalSetNotCurrent);

        if (current.CurrentProposalSet.Status is not (ProposalSetStatus.Pending or ProposalSetStatus.PartiallyFailed))
            return StateTransition.Rejected(TransitionRejection.InvalidPhase);

        return StateTransition.MoveTo(
            ConversationPhase.FollowUp,
            GenerationStatus.Idle,
            ActionSets.ChatOnly,
            addFacts: Facts.Of(ConversationFact.HasRejectedProposal),
            removeFacts: Facts.Of(ConversationFact.HasPendingProposalSet),
            mutations:
            [
                new UpdateProposalSetStatusMutation(input.ProposalSetId, ProposalSetStatus.Rejected),
                new ClearCurrentProposalSetMutation(input.ProposalSetId),
            ],
            events: [new ProposalSetRejected(input.ProposalSetId)]);
    }
}

/// <summary>Every task on the card created: set Completed, phase FollowUp (v3 §7.5).</summary>
public sealed class ProposalSetPersistenceSucceededHandler
    : IConversationTransitionHandler<ProposalSetPersistenceSucceeded>
{
    public IReadOnlySet<ConversationPhase> SupportedPhases { get; } = new HashSet<ConversationPhase>
    {
        ConversationPhase.ActionPending,
    };

    public StateTransition Reduce(
        ConversationSnapshot current,
        ProposalSetPersistenceSucceeded input,
        AiCoachModeDefinition mode)
    {
        if (current.CurrentProposalSet is null || current.CurrentProposalSet.Id != input.ProposalSetId)
            return StateTransition.Rejected(TransitionRejection.ProposalSetNotCurrent);

        if (current.CurrentProposalSet.Status != ProposalSetStatus.Processing)
            return StateTransition.Rejected(TransitionRejection.InvalidPhase);

        if (input.PersistedProposals.Count == 0)
            return StateTransition.Rejected(TransitionRejection.InvalidPhase);

        var mutations = new List<DomainMutation>();
        foreach (var item in input.PersistedProposals)
            mutations.Add(new RecordPersistedTaskMutation(input.ProposalSetId, item.ProposalId, item.TaskId));
        mutations.Add(new UpdateProposalSetStatusMutation(input.ProposalSetId, ProposalSetStatus.Completed));

        return StateTransition.MoveTo(
            ConversationPhase.FollowUp,
            GenerationStatus.Idle,
            ActionSets.ChatOnly,
            addFacts: Facts.Of(ConversationFact.HasAcceptedProposal),
            removeFacts: Facts.Of(ConversationFact.HasProcessingProposalSet),
            mutations: mutations,
            events:
            [
                new ProposalSetPersisted(input.ProposalSetId,
                    input.PersistedProposals.Select(i => i.TaskId).ToList()),
            ]);
    }
}

/// <summary>
/// Task creation failed for at least one proposal: the set recovers to PartiallyFailed
/// (projected as an editable pending card) with the user's edits intact; proposals created
/// before the failure are recorded so a retry only creates the remaining ones. The model never
/// claims the tasks saved.
/// </summary>
public sealed class ProposalSetPersistenceFailedHandler
    : IConversationTransitionHandler<ProposalSetPersistenceFailed>
{
    public IReadOnlySet<ConversationPhase> SupportedPhases { get; } = new HashSet<ConversationPhase>
    {
        ConversationPhase.ActionPending,
    };

    public StateTransition Reduce(
        ConversationSnapshot current,
        ProposalSetPersistenceFailed input,
        AiCoachModeDefinition mode)
    {
        if (current.CurrentProposalSet is null || current.CurrentProposalSet.Id != input.ProposalSetId)
            return StateTransition.Rejected(TransitionRejection.ProposalSetNotCurrent);

        if (current.CurrentProposalSet.Status != ProposalSetStatus.Processing)
            return StateTransition.Rejected(TransitionRejection.InvalidPhase);

        var mutations = new List<DomainMutation>();
        foreach (var item in input.PersistedProposals)
            mutations.Add(new RecordPersistedTaskMutation(input.ProposalSetId, item.ProposalId, item.TaskId));
        mutations.Add(new UpdateProposalSetStatusMutation(input.ProposalSetId, ProposalSetStatus.PartiallyFailed));

        return StateTransition.MoveTo(
            ConversationPhase.ActionPending,
            GenerationStatus.Idle,
            ActionSets.ForPendingSet(current.CurrentProposalSet),
            addFacts: Facts.Of(ConversationFact.HasPendingProposalSet),
            removeFacts: Facts.Of(ConversationFact.HasProcessingProposalSet),
            mutations: mutations);
    }
}
