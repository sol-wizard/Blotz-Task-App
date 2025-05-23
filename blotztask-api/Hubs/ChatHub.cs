using BlotzTask.Services;
using Microsoft.AspNetCore.SignalR;

public class ChatHub : Hub
{
    private readonly ILogger<ChatHub> _logger;
    private readonly ConversationStateService _stateService;
    private readonly IChatHubService _chatHubService;

    public ChatHub(
    ILogger<ChatHub> logger,
    ConversationStateService stateService,
    IChatHubService chatHubService)
    {
        _logger = logger;
        _stateService = stateService;
        _chatHubService = chatHubService;
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
        await _chatHubService.HandleSendMessage(user, message, conversationId, Clients);
    }
}