using System.Windows.Input;

namespace BlotzTask.Modules.Tasks.Commands.RecurringTasks;

public class AddRecurringTaskCommand
{
    public DateTime Timestamp { get; set; }
}

public class AddRecurringTaskCommandHandler(ILogger<AddRecurringTaskCommandHandler> logger)
{
    public Task<string> Handle(AddRecurringTaskCommand command, CancellationToken ct)
    {
        logger.LogInformation("Adding recurring task started at {Timestamp}", command.Timestamp);

        logger.LogInformation("Recurring task generation completed successfully at {Timestamp}", command.Timestamp);

        return Task.FromResult("Recurring task generation completed.");
    }
}