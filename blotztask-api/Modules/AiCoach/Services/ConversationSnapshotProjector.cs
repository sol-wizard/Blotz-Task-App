using BlotzTask.Modules.AiCoach.Artifacts;
using BlotzTask.Modules.AiCoach.Contracts;
using BlotzTask.Modules.AiCoach.Domain;
using BlotzTask.Modules.AiCoach.StateMachine;

namespace BlotzTask.Modules.AiCoach.Services;

public interface IConversationSnapshotProjector
{
    ConversationSnapshot ToDomain(AiConversation conversation);
    ConversationSnapshotDto ToDto(AiConversation conversation, ClientArtifactCapabilities clientCapabilities);
}

public sealed class ConversationSnapshotProjector(
    IAllowedActionResolver allowedActionResolver,
    IArtifactRegistry artifactRegistry) : IConversationSnapshotProjector
{
    public ConversationSnapshot ToDomain(AiConversation conversation)
    {
        var artifact = conversation.CurrentArtifact;
        var artifactSnapshot = artifact is null ? null : new CurrentArtifactSnapshot(
            artifact.Id, artifact.Type, artifact.SchemaVersion, artifact.Version, artifact.Status);
        return new ConversationSnapshot(
            conversation.Id, conversation.UserId, conversation.Mode, conversation.LifecycleStatus,
            conversation.State, conversation.GenerationStatus, conversation.BlockedReason,
            conversation.Version, artifactSnapshot,
            allowedActionResolver.Resolve(conversation.LifecycleStatus, conversation.State,
                conversation.GenerationStatus, artifactSnapshot));
    }

    public ConversationSnapshotDto ToDto(
        AiConversation conversation, ClientArtifactCapabilities clientCapabilities)
    {
        var snapshot = ToDomain(conversation);
        var recentTurns = conversation.Messages.Select(message => message.TurnNumber)
            .Distinct().OrderByDescending(turn => turn).Take(20).ToHashSet();
        var messages = conversation.Messages
            .Where(message => recentTurns.Contains(message.TurnNumber))
            .OrderBy(message => message.TurnNumber).ThenBy(message => message.Sequence)
            .Select(message => new ConversationMessageDto(message.Id, message.TurnNumber,
                message.Sequence, ProtocolValue.From(message.Role), message.Content,
                message.ArtifactId, message.CreatedAt)).ToArray();

        return new ConversationSnapshotDto(
            AiCoachProtocol.CurrentVersion, conversation.Id, conversation.Version,
            ProtocolValue.From(conversation.Mode), ProtocolValue.From(conversation.LifecycleStatus),
            ProtocolValue.From(conversation.State), ProtocolValue.From(conversation.GenerationStatus),
            conversation.BlockedReason is null ? null : ProtocolValue.From(conversation.BlockedReason.Value),
            messages.LastOrDefault(message => message.Role == "assistant")?.Content,
            conversation.CurrentArtifact is null
                ? null
                : ToArtifactDto(conversation.CurrentArtifact, conversation.State, clientCapabilities),
            messages, snapshot.AllowedActions.Select(ProtocolValue.From).Order(StringComparer.Ordinal).ToArray(),
            artifactRegistry.SupportedArtifacts);
    }

    private CurrentArtifactDto ToArtifactDto(
        AiConversationArtifact artifact,
        ConversationState state,
        ClientArtifactCapabilities clientCapabilities)
    {
        var type = ProtocolValue.From(artifact.Type);
        var supported = clientCapabilities.Supports(type, artifact.SchemaVersion);
        var projection = artifactRegistry.Get(artifact.Type, artifact.SchemaVersion).Project(artifact, state);
        return new CurrentArtifactDto(
            artifact.Id, type, artifact.SchemaVersion, artifact.Version,
            ProtocolValue.From(artifact.Status), supported ? projection.Payload : null,
            supported
                ? projection.AllowedActions.Select(ProtocolValue.From).Order(StringComparer.Ordinal).ToArray()
                : [],
            !supported);
    }
}
