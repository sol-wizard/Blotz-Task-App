using BlotzTask.Services;
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
        // 1. Echo user's message back
        await Clients.Caller.SendAsync("ReceiveMessage", user, message, conversationId);

        // 2. Get bot reply from service
        string botReply = await _goalPlannerChatService.HandleSendMessage(user, message, conversationId);

        // 3. Send bot reply
        await Clients.Caller.SendAsync("ReceiveMessage", "ChatBot", botReply, conversationId);
        // await _chatHubService.HandleSendMessage(user, message, conversationId, Clients);
    }
}