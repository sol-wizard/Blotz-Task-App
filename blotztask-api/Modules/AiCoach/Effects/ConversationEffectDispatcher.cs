using BlotzTask.Modules.AiCoach.Domain;

namespace BlotzTask.Modules.AiCoach.Effects;

public interface IConversationEffectHandler
{
    string EffectType { get; }
    int SchemaVersion { get; }
    Task<ConversationEventResult> ExecuteAsync(AiConversationEffect effect, CancellationToken cancellationToken);
}

public sealed record ConversationEventResult(Guid EffectId, int BaseConversationVersion, object ResultEvent);

public interface IConversationEffectDispatcher
{
    Task<ConversationEventResult> DispatchAsync(AiConversationEffect effect, CancellationToken cancellationToken);
}

public sealed class ConversationEffectDispatcher(IEnumerable<IConversationEffectHandler> handlers)
    : IConversationEffectDispatcher
{
    private readonly IReadOnlyDictionary<(string, int), IConversationEffectHandler> _handlers = Build(handlers);

    public Task<ConversationEventResult> DispatchAsync(
        AiConversationEffect effect, CancellationToken cancellationToken) =>
        _handlers.TryGetValue((effect.Type, effect.SchemaVersion), out var handler)
            ? handler.ExecuteAsync(effect, cancellationToken)
            : throw new InvalidOperationException(
                $"No handler is registered for effect '{effect.Type}' schema '{effect.SchemaVersion}'.");

    private static IReadOnlyDictionary<(string, int), IConversationEffectHandler> Build(
        IEnumerable<IConversationEffectHandler> handlers)
    {
        var all = handlers.ToArray();
        var duplicate = all.GroupBy(handler => (handler.EffectType, handler.SchemaVersion))
            .FirstOrDefault(group => group.Count() > 1);
        if (duplicate is not null)
            throw new InvalidOperationException($"Effect handler '{duplicate.Key}' is registered more than once.");
        return all.ToDictionary(handler => (handler.EffectType, handler.SchemaVersion));
    }
}
