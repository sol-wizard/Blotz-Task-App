using System.Windows.Input;

namespace BlotzTask.Modules.Tasks.Commands.RecurringTasks;

public class AddRecurringTaskCommand
{
    public DateTime Timestamp { get; set; }
}

public class AddRecurringTaskCommandHandler(ILogger<AddRecurringTaskCommandHandler> logger)
{
    public async Task<string> Handle(AddRecurringTaskCommand command, CancellationToken ct)
    {
        logger.LogInformation("Adding recurring task started at {Timestamp}", command.Timestamp);
        
        await Task.Delay(100, ct);
        
        logger.LogInformation("Recurring task generation completed successfully at {Timestamp}", command.Timestamp);
        
        return "Recurring task generation completed.";
    }
}