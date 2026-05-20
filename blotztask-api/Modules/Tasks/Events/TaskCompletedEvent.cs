using BlotzTask.Shared.Events;

namespace BlotzTask.Modules.Tasks.Events;

public class TaskCompletedEvent : IDomainEvent
{
    public required Guid UserId { get; init; }
    public required string TriggerAction { get; init; }
    public required int TaskId { get; init; }
}
