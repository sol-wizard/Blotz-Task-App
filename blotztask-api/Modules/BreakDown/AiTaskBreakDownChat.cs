using Microsoft.AspNetCore.SignalR;
using BlotzTask.Modules.BreakDown.Services;
using BlotzTask.Shared.Store;

namespace BlotzTask.Modules.BreakDown;

public class AiTaskBreakDownChat : Hub
{
    private readonly ILogger<AiTaskBreakDownChat> _logger;
    private readonly ITaskBreakdownService _taskBreakdownService;
    private readonly ChatHistoryStore _chatHistoryStore;

    public AiTaskBreakDownChat(
        ILogger<AiTaskBreakDownChat> logger,
        ITaskBreakdownService taskBreakdownService, ChatHistoryStore chatHistoryStore)
    {
        _logger = logger;
        _taskBreakdownService = taskBreakdownService;
        _chatHistoryStore = chatHistoryStore;
    }

    private string GenerateConversationId()
    {
        // Generate a new unique conversation ID (GUID)
        return Guid.NewGuid().ToString();
    }

    public override async Task OnConnectedAsync()
    {
        var conversationId = GenerateConversationId();
        //TODO: Should be a better way to do this conversation id , should not need to store in context i reckon 
        Context.Items["ConversationId"] = conversationId;
        await Clients.Caller.SendAsync("ReceiveConversationId", conversationId);
        await base.OnConnectedAsync();
    }
    
    public async Task BreakdownTask(string taskId)
    {
        await Clients.Caller.SendAsync("BotTyping", true);

        // Retrieve the conversationId from Context.Items
        var conversationId = Context.Items["ConversationId"] as string;
        CancellationToken ct = Context.ConnectionAborted;
        var subtasks = await _taskBreakdownService.BreakdownTaskAsync(taskId, conversationId!, ct);
        await Clients.Caller.SendAsync("BotTyping", false);
        await Clients.Caller.SendAsync("ReceiveSubtasks", subtasks);
    }

    // User wants to modify the current breakdown
    public async Task ModifyBreakdown(string userRequest)
    {
        await Clients.Caller.SendAsync("BotTyping", true);

        // Pass the stored conversationId to the service
        var updatedSubtasks = await _taskBreakdownService.ModifyBreakdownAsync(userRequest, Context.Items["ConversationId"] as string);
        await Clients.Caller.SendAsync("BotTyping", false);
        await Clients.Caller.SendAsync("ReceiveSubtasks", updatedSubtasks);
    }
    
    // Handle disconnections to clean up resources
    public override async Task OnDisconnectedAsync(Exception exception)
    {
        if (exception != null)
        {
            _logger.LogError(exception, $"Client {Context.ConnectionId} abnormal disconnected : {exception.Message}");
        }

        _chatHistoryStore.Remove(Context.ConnectionId);

        await base.OnDisconnectedAsync(exception);
    }
}

public class TaskDetailsDto
{
    public string id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class SubTask
{
    public string Title { get; set; } = string.Empty;
    public TimeSpan Duration { get; set; }
    
    public int Order { get; set; }
}
