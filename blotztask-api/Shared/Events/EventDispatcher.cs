namespace BlotzTask.Shared.Events;

public class EventDispatcher(IServiceProvider serviceProvider) : IEventDispatcher
{
    public async Task DispatchAsync<TEvent>(TEvent domainEvent, CancellationToken ct = default)
        where TEvent : IDomainEvent
    {
        var handlers = serviceProvider.GetServices<IDomainEventHandler<TEvent>>();
        foreach (var handler in handlers)
        {
            await handler.HandleAsync(domainEvent, ct);
        }
    }
}
