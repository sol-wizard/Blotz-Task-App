using BlotzTask.Exceptions;
using BlotzTask.Models.GoalToTask;
using BlotzTask.Services.GoalPlanner;
using Microsoft.AspNetCore.SignalR;

public class ChatHub : Hub
{
    private readonly ILogger<ChatHub> _logger;
    private readonly IGoalPlannerChatService _goalPlannerChatService;

    public ChatHub(
    ILogger<ChatHub> logger, 
    IGoalPlannerChatService goalPlannerChatService)
    {
        _logger = logger;
        _goalPlannerChatService = goalPlannerChatService;
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
        
        // Send BotTyping signal to clients
        await Clients.Caller.SendAsync("BotTyping", true);

        try
        {
            var result = await _goalPlannerChatService.HandleUserMessageAsync(userMsg);

            if (result.IsConversationComplete)
            {
                await Clients.Caller.SendAsync("ReceiveMessage", result.BotMessage);
                await Clients.Caller.SendAsync("BotTyping", false);
                await Clients.Caller.SendAsync("ConversationCompleted", conversationId);
                return;
            }

            if (result.Tasks != null)
            {
                await Clients.Caller.SendAsync("ReceiveTasks", result.Tasks);
            }

            await Clients.Caller.SendAsync("ReceiveMessage", result.BotMessage);
            await Clients.Caller.SendAsync("BotTyping", false);
        }
        catch (TokenLimitExceededException ex)
        {
            await Clients.Caller.SendAsync("BotTyping", false);

            await Clients.Caller.SendAsync("TokenLimitExceeded", new
            {
                errorType = "TokenLimitExceeded",
                message = ex.Message
            });
        }
    }
}