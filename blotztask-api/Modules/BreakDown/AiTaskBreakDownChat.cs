using Microsoft.AspNetCore.SignalR;
using BlotzTask.Modules.BreakDown.Services;

namespace BlotzTask.Modules.BreakDown;

public class AiTaskBreakDownChat : Hub
{
    private readonly ILogger<AiTaskBreakDownChat> _logger;
    private readonly ITaskBreakdownService _taskBreakdownService;

    public AiTaskBreakDownChat(
        ILogger<AiTaskBreakDownChat> logger,
        ITaskBreakdownService taskBreakdownService)
    {
        _logger = logger;
        _taskBreakdownService = taskBreakdownService;
    }

    // User hits button in frontend - starts breakdown with conversation ID
    public async Task BreakdownTask(TaskDetailsDto taskDetails, string conversationId)
    {
        await Clients.Caller.SendAsync("BotTyping", true);

        try
        {
            // TODO: Call your AI service to break down the task
            var subtasks = await _taskBreakdownService.BreakdownTaskAsync(taskDetails, conversationId);
            
            await Clients.Caller.SendAsync("BotTyping", false);
            await Clients.Caller.SendAsync("ReceiveBreakdown", subtasks);
        }
        finally
        {
            await Clients.Caller.SendAsync("BotTyping", false);
        }
    }

    // User wants to modify the current breakdown
    public async Task ModifyBreakdown(string userRequest, string conversationId)
    {
        await Clients.Caller.SendAsync("BotTyping", true);

        try
        {
            // TODO: Call your AI service to modify the existing breakdown based on user request
            var updatedSubtasks = await _taskBreakdownService.ModifyBreakdownAsync(userRequest, conversationId);
            
            await Clients.Caller.SendAsync("BotTyping", false);
            await Clients.Caller.SendAsync("ReceiveBreakdown", updatedSubtasks);
        }
        finally
        {
            await Clients.Caller.SendAsync("BotTyping", false);
        }
    }
}

public class TaskDetailsDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class SubTask
{
    public string Title { get; set; } = string.Empty;
    public TimeSpan Duration { get; set; }
}
