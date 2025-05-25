using BlotzTask.Models.GoalToTask;
using BlotzTask.Services;
using BlotzTask.Services.GoalPlanner;
using Microsoft.AspNetCore.SignalR;

public class ChatHub : Hub
{
    private readonly ILogger<ChatHub> _logger;
    private readonly ConversationStateService _stateService;
    private readonly IChatHubService _chatHubService;
    private readonly IGoalPlannerChatService _goalPlannerChatService;

    public ChatHub(
    ILogger<ChatHub> logger,
    ConversationStateService stateService,
    IGoalPlannerChatService goalPlannerChatService,
    IChatHubService chatHubService)
    {
        _logger = logger;
        _stateService = stateService;
        _chatHubService = chatHubService;
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
        _stateService.RemoveConversation(connectionId);
        _logger.LogInformation($"User disconnected: {connectionId}. Exception: {exception?.Message}");
        await base.OnDisconnectedAsync(exception);
    }


    //TODO: Add comments about Functionality and param explain...
    public async Task SendMessage(string user, string message, string conversationId)
    {
        // Check if this is the user's first message in the conversation.
        // If no chat history exists, initialize a new conversation with a system prompt.
        if (!_stateService.TryGetChatHistory(conversationId, out var chatHistory))
        {
            chatHistory = _goalPlannerChatService.InitializeNewConversation(conversationId);
        }
        
        // 1. Echo user's message back
        var userMsg = new ConversationMessage
        {
            Sender = user,
            Content = message,
            ConversationId = conversationId,
            Timestamp = DateTime.UtcNow,
            IsBot = false
        };
        chatHistory.AddUserMessage(userMsg.Content);
        await Clients.Caller.SendAsync("ReceiveMessage", userMsg);

        // Generate bot response
        var botContent = await _goalPlannerChatService.GenerateAiResponse(chatHistory);
    
        // Create and send the bot's message
        var botMsg = new ConversationMessage
        {
            Sender = "ChatBot",
            Content = botContent,
            ConversationId = conversationId,
            Timestamp = DateTime.UtcNow,
            IsBot = true
        };
        await Clients.Caller.SendAsync("ReceiveMessage", botMsg);
        // await _chatHubService.HandleSendMessage(user, message, conversationId, Clients);
    }
}