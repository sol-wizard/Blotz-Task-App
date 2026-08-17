using System.Text.Json;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Contracts;
using BlotzTask.Modules.AiCoach.Domain;
using BlotzTask.Modules.AiCoach.StateMachine;
using BlotzTask.Modules.AiCoach.ModelTurn;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.AiCoach.Artifacts;

public sealed record ArtifactProjection(JsonElement Payload, IReadOnlySet<ConversationAction> AllowedActions);

public interface IArtifactHandler
{
    ArtifactType Type { get; }
    int SchemaVersion { get; }
    ArtifactProjection Project(AiConversationArtifact artifact, ConversationState state);
    IReadOnlySet<ConversationAction> ResolveAllowedActions(ArtifactStatus status, ConversationState state);
}

public abstract class ArtifactHandler<TDetail> : IArtifactHandler
    where TDetail : class, IArtifactDetail
{
    public abstract ArtifactType Type { get; }
    public abstract int SchemaVersion { get; }

    public ArtifactProjection Project(AiConversationArtifact artifact, ConversationState state)
    {
        if (artifact.Detail is not TDetail detail)
            throw new InvalidOperationException(
                $"Artifact '{artifact.Id}' does not contain the registered '{typeof(TDetail).Name}' detail.");

        return Project(artifact, detail, state);
    }

    protected abstract ArtifactProjection Project(
        AiConversationArtifact artifact,
        TDetail detail,
        ConversationState state);

    public abstract IReadOnlySet<ConversationAction> ResolveAllowedActions(
        ArtifactStatus status,
        ConversationState state);
}

public interface IArtifactRegistry
{
    IArtifactHandler Get(ArtifactType type, int schemaVersion);
    IReadOnlySet<ConversationAction> ResolveAllowedActions(CurrentArtifactSnapshot artifact, ConversationState state);
    IReadOnlyDictionary<string, IReadOnlyList<int>> SupportedArtifacts { get; }
}

public interface IArtifactDetailLoader
{
    ArtifactType Type { get; }
    int SchemaVersion { get; }
    Task LoadAsync(AiConversationArtifact artifact, CancellationToken cancellationToken);
}

public interface IArtifactDetailLoaderRegistry
{
    Task LoadAsync(AiConversationArtifact artifact, CancellationToken cancellationToken);
}

public interface IArtifactCommitHandler
{
    ArtifactType Type { get; }
    int SchemaVersion { get; }
    void Commit(
        AiConversation conversation,
        ProposedArtifactChange proposal,
        Guid createdByEffectId,
        DateTimeOffset occurredAt);
}

public interface IArtifactCommitRegistry
{
    void Commit(
        AiConversation conversation,
        ProposedArtifactChange proposal,
        Guid createdByEffectId,
        DateTimeOffset occurredAt);
}

public sealed class ArtifactCommitRegistry(IEnumerable<IArtifactCommitHandler> handlers)
    : IArtifactCommitRegistry
{
    private readonly IReadOnlyDictionary<(ArtifactType, int), IArtifactCommitHandler> _handlers = Build(handlers);

    public void Commit(
        AiConversation conversation,
        ProposedArtifactChange proposal,
        Guid createdByEffectId,
        DateTimeOffset occurredAt)
    {
        if (!_handlers.TryGetValue((proposal.Type, proposal.SchemaVersion), out var handler))
            throw new UnsupportedArtifactSchemaException(proposal.Type, proposal.SchemaVersion);
        handler.Commit(conversation, proposal, createdByEffectId, occurredAt);
    }

    private static IReadOnlyDictionary<(ArtifactType, int), IArtifactCommitHandler> Build(
        IEnumerable<IArtifactCommitHandler> handlers)
    {
        var all = handlers.ToArray();
        var duplicate = all.GroupBy(handler => (handler.Type, handler.SchemaVersion))
            .FirstOrDefault(group => group.Count() > 1);
        if (duplicate is not null)
            throw new InvalidOperationException($"Artifact commit handler '{duplicate.Key}' is registered more than once.");
        return all.ToDictionary(handler => (handler.Type, handler.SchemaVersion));
    }
}

public sealed class TaskDraftArtifactCommitHandler(BlotzTaskDbContext db) : IArtifactCommitHandler
{
    public ArtifactType Type => ArtifactType.TaskDraft;
    public int SchemaVersion => 1;

    public void Commit(
        AiConversation conversation,
        ProposedArtifactChange proposal,
        Guid createdByEffectId,
        DateTimeOffset occurredAt)
    {
        if (proposal.Detail is not AiTaskDraftArtifact detail)
            throw new InvalidOperationException("Task Draft proposal detail is invalid.");
        if (detail.ArtifactId != proposal.ArtifactId)
            throw new InvalidOperationException("Task Draft header and detail IDs must match.");

        var artifact = AiConversationArtifact.Create(
            proposal.ArtifactId,
            conversation.Id,
            proposal.Type,
            proposal.SchemaVersion,
            createdByEffectId,
            occurredAt);
        artifact.AttachDetail(detail);
        db.AiConversationArtifacts.Add(artifact);
        db.AiTaskDraftArtifacts.Add(detail);
        conversation.SetCurrentArtifact(artifact);
    }
}

public sealed class ArtifactDetailLoaderRegistry(IEnumerable<IArtifactDetailLoader> loaders)
    : IArtifactDetailLoaderRegistry
{
    private readonly IReadOnlyDictionary<(ArtifactType, int), IArtifactDetailLoader> _loaders = Build(loaders);

    public Task LoadAsync(AiConversationArtifact artifact, CancellationToken cancellationToken) =>
        _loaders.TryGetValue((artifact.Type, artifact.SchemaVersion), out var loader)
            ? loader.LoadAsync(artifact, cancellationToken)
            : throw new UnsupportedArtifactSchemaException(artifact.Type, artifact.SchemaVersion);

    private static IReadOnlyDictionary<(ArtifactType, int), IArtifactDetailLoader> Build(
        IEnumerable<IArtifactDetailLoader> loaders)
    {
        var all = loaders.ToArray();
        var duplicate = all.GroupBy(loader => (loader.Type, loader.SchemaVersion))
            .FirstOrDefault(group => group.Count() > 1);
        if (duplicate is not null)
            throw new InvalidOperationException($"Artifact detail loader '{duplicate.Key}' is registered more than once.");
        return all.ToDictionary(loader => (loader.Type, loader.SchemaVersion));
    }
}

public sealed class TaskDraftArtifactDetailLoader(BlotzTaskDbContext db) : IArtifactDetailLoader
{
    public ArtifactType Type => ArtifactType.TaskDraft;
    public int SchemaVersion => 1;
    public async Task LoadAsync(AiConversationArtifact artifact, CancellationToken cancellationToken)
    {
        var detail = await db.AiTaskDraftArtifacts.SingleOrDefaultAsync(
            item => item.ArtifactId == artifact.Id, cancellationToken);
        if (detail is not null) artifact.AttachDetail(detail);
    }
}

public sealed class ArtifactRegistry(IEnumerable<IArtifactHandler> handlers) : IArtifactRegistry
{
    private readonly IReadOnlyDictionary<(ArtifactType, int), IArtifactHandler> _handlers = Build(handlers);

    public IReadOnlyDictionary<string, IReadOnlyList<int>> SupportedArtifacts => _handlers.Keys
        .GroupBy(key => ProtocolValue.From(key.Item1))
        .ToDictionary(group => group.Key, group => (IReadOnlyList<int>)group.Select(key => key.Item2).Order().ToArray());

    public IArtifactHandler Get(ArtifactType type, int schemaVersion) =>
        _handlers.TryGetValue((type, schemaVersion), out var handler)
            ? handler
            : throw new UnsupportedArtifactSchemaException(type, schemaVersion);

    public IReadOnlySet<ConversationAction> ResolveAllowedActions(
        CurrentArtifactSnapshot artifact, ConversationState state) =>
        Get(artifact.Type, artifact.SchemaVersion).ResolveAllowedActions(artifact.Status, state);

    private static IReadOnlyDictionary<(ArtifactType, int), IArtifactHandler> Build(IEnumerable<IArtifactHandler> handlers)
    {
        var all = handlers.ToArray();
        var duplicate = all.GroupBy(handler => (handler.Type, handler.SchemaVersion))
            .FirstOrDefault(group => group.Count() > 1);
        if (duplicate is not null)
            throw new InvalidOperationException($"Artifact handler '{duplicate.Key}' is registered more than once.");
        return all.ToDictionary(handler => (handler.Type, handler.SchemaVersion));
    }
}

public sealed class TaskDraftArtifactHandler : ArtifactHandler<AiTaskDraftArtifact>
{
    public override ArtifactType Type => ArtifactType.TaskDraft;
    public override int SchemaVersion => 1;

    protected override ArtifactProjection Project(
        AiConversationArtifact artifact,
        AiTaskDraftArtifact draft,
        ConversationState state)
    {
        var actions = ResolveAllowedActions(artifact.Status, state);
        var payload = JsonSerializer.SerializeToElement(
            new TaskDraftPayloadDto(ProtocolValue.From(draft.Kind), draft.Title, draft.Description,
                draft.StartTimeUtc, draft.EndTimeUtc, draft.TimeZoneId,
                draft.StartDateLocal, draft.EndDateLocal, draft.LabelId));
        return new ArtifactProjection(payload, actions);
    }

    public override IReadOnlySet<ConversationAction> ResolveAllowedActions(
        ArtifactStatus status,
        ConversationState state) => new HashSet<ConversationAction>();
}

public sealed class UnsupportedArtifactSchemaException(ArtifactType type, int schemaVersion)
    : Exception($"Artifact '{type}' schema version '{schemaVersion}' is not supported by this server.");
