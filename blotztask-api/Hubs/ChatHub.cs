using BlotzTask.Models.GoalToTask;
using BlotzTask.Services.GoalPlanner;
using Microsoft.AspNetCore.SignalR;

public class ChatHub : Hub
{
    private readonly ILogger<ChatHub> _logger;
    private readonly IGoalPlannerChatService _goalPlannerChatService;
    private readonly IConversationStateService _conversationStateService;

    public ChatHub(
    ILogger<ChatHub> logger, 
    IGoalPlannerChatService goalPlannerChatService,
    IConversationStateService conversationStateService)
    {
        _logger = logger;
        _goalPlannerChatService = goalPlannerChatService;
        _conversationStateService = conversationStateService;
    }
    public override async Task OnConnectedAsync()
    {
        string connectionId = Context.ConnectionId;
        _logger.LogInformation($"User connected: {connectionId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string connectionId = Context.ConnectionId;
        _logger.LogInformation($"User disconnected: {connectionId}. Exception: {exception?.Message}");
        await base.OnDisconnectedAsync(exception);
    }
    
    public async Task SendMessage(string user, string message, string conversationId)
    {
        var userMsg = new ConversationMessage
        {
            Sender = user,
            Content = message,
            ConversationId = conversationId,
            Timestamp = DateTime.UtcNow,
            IsBot = false
        };

        await Clients.Caller.SendAsync("ReceiveMessage", userMsg);

        var result = await _goalPlannerChatService.HandleUserMessageAsync(userMsg);

        if (result.Tasks != null)
        {
            await Clients.Caller.SendAsync("ReceiveTasks", result.Tasks);
        }
        else if (!result.IsConversationComplete)
        {
            await Clients.Caller.SendAsync("ReceiveMessage", result.BotMessage);
        }
        

        if (result.IsConversationComplete)
        {
            // ✅ Cleanup state after completion
            _conversationStateService.RemoveConversation(conversationId);
            await Clients.Caller.SendAsync("ConversationCompleted", conversationId);
        }
    }
}