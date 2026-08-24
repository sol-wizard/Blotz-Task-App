using BlotzTask.Modules.AiCoach.Domain.Artifacts;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;

namespace BlotzTask.Modules.AiCoach.Domain.Capabilities;

/// <summary>Stable rejection codes (tech design §21.10/§21.16).</summary>
public enum CapabilityRejectionCode
{
    None = 0,
    CapabilityNotRegistered = 1,
    CapabilityVersionUnsupported = 2,
    InvokerNotAllowed = 3,
    ConversationOwnershipViolation = 4,
    LifecycleNotAllowed = 5,
    ModeNotAllowed = 6,
    InvalidState = 7,
    CurrentArtifactNotAllowed = 8,
    ExplicitConsentRequired = 9,
    PendingDraftAlreadyExists = 10,
    ArtifactAlreadyProposedInCurrentTurn = 11,
    MissingRequiredInformation = 12,
    SchemaValidationFailed = 13,
    DuplicateInvocation = 14,
}

/// <summary>
/// What the guard evaluates. <paramref name="ProposedArtifactInTurn"/> reflects the live
/// TurnView (tech design §21.11): later tool calls in the same turn must see earlier proposals.
/// </summary>
public sealed record CapabilityRequest(
    CapabilityId CapabilityId,
    int CapabilityVersion,
    CapabilityInvoker Invoker,
    Guid RequestingUserId,
    bool ProposedArtifactInTurn,
    IReadOnlyList<Guid> ProcessedInvocationIds,
    Guid InvocationId);

public sealed record CapabilityDecision(
    bool IsAllowed,
    CapabilityRejectionCode RejectionCode,
    string? RejectionDetail)
{
    public static readonly CapabilityDecision Allowed = new(true, CapabilityRejectionCode.None, null);

    public static CapabilityDecision Rejected(CapabilityRejectionCode code, string? detail = null) =>
        new(false, code, detail);
}

public interface ICapabilityGuard
{
    CapabilityDecision Evaluate(
        CapabilityRequest request,
        ConversationSnapshot conversation,
        AiCoachModeDefinition mode);
}

/// <summary>
/// The mandatory guard pipeline (tech design §14). The check order below is FIXED by the
/// design doc and must not be reordered or short-circuited differently — even when the prompt
/// already forbids an action, this guard independently enforces it. Input schema and business
/// field validation (step 10 in the doc) live with the capability handler, which the dispatcher
/// runs only after this guard allows the call.
/// </summary>
public sealed class CapabilityGuard(CapabilityRegistry registry) : ICapabilityGuard
{
    public CapabilityDecision Evaluate(
        CapabilityRequest request,
        ConversationSnapshot conversation,
        AiCoachModeDefinition mode)
    {
        // 1. Capability exists and the requested version is supported.
        var definition = registry.Find(request.CapabilityId);
        if (definition is null)
            return CapabilityDecision.Rejected(CapabilityRejectionCode.CapabilityNotRegistered);
        if (definition.CapabilityVersion != request.CapabilityVersion)
            return CapabilityDecision.Rejected(CapabilityRejectionCode.CapabilityVersionUnsupported);

        // 2. Invoker allowed.
        if (!definition.AllowedInvokers.Contains(request.Invoker))
            return CapabilityDecision.Rejected(CapabilityRejectionCode.InvokerNotAllowed);

        // 3. Conversation belongs to the requesting user.
        if (conversation.UserId != request.RequestingUserId)
            return CapabilityDecision.Rejected(CapabilityRejectionCode.ConversationOwnershipViolation);

        // 4. Conversation lifecycle allows the operation.
        if (conversation.LifecycleStatus != ConversationLifecycleStatus.Active)
            return CapabilityDecision.Rejected(CapabilityRejectionCode.LifecycleNotAllowed);

        // 5. Current mode allows the capability.
        if (!definition.AllowedModes.Contains(conversation.Mode) || !mode.Capabilities.Contains(definition.Id))
            return CapabilityDecision.Rejected(CapabilityRejectionCode.ModeNotAllowed);

        // 6. Current state allows the capability.
        if (!definition.AllowedStates.Contains(conversation.State))
            return CapabilityDecision.Rejected(CapabilityRejectionCode.InvalidState);

        // 7. Current artifact type/status allows the capability.
        if (conversation.CurrentArtifact is not null
            && !definition.AllowedCurrentArtifacts.Contains(conversation.CurrentArtifact.Type))
            return CapabilityDecision.Rejected(CapabilityRejectionCode.CurrentArtifactNotAllowed);

        // 8. Verifiable consent evidence when required. V1's only capability needs none;
        //    consent-gated capabilities (Clarify/Companion draft creation) plug in here.
        if (definition.ConsentRequirement == ConsentRequirement.ExplicitUserCommand
            && request.Invoker != CapabilityInvoker.UserCommand)
            return CapabilityDecision.Rejected(CapabilityRejectionCode.ExplicitConsentRequired);

        // 9. Domain invariants: single pending draft (scenario §19.3) and single artifact
        //    proposal per model turn (§21.11 rule 4).
        if (definition.ExecutionSemantics == CapabilityExecutionSemantics.ProposesArtifact)
        {
            if (request.ProposedArtifactInTurn)
                return CapabilityDecision.Rejected(CapabilityRejectionCode.ArtifactAlreadyProposedInCurrentTurn);

            if (conversation.CurrentArtifact is { Status: ArtifactStatus.Pending or ArtifactStatus.Processing })
                return CapabilityDecision.Rejected(CapabilityRejectionCode.PendingDraftAlreadyExists);
        }

        // 10. Duplicate invocation (CommandId / EffectId already processed).
        if (request.ProcessedInvocationIds.Contains(request.InvocationId))
            return CapabilityDecision.Rejected(CapabilityRejectionCode.DuplicateInvocation);

        // Steps 11-13 of the doc's pipeline (input schema + business validation, handler
        // execution, event conversion) are performed by the dispatcher/handler after this
        // guard allows the call — validation failures there use the same stable codes.
        return CapabilityDecision.Allowed;
    }
}
