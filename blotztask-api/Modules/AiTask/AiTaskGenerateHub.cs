using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.Chat;

public class AiTaskChatHub : Hub
{
    private readonly ILogger<AiTaskChatHub> _logger;

    public AiTaskChatHub(
        ILogger<AiTaskChatHub> logger)
    {
        _logger = logger;
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
    
    public async Task SendMessage(string message)
    {
        await Clients.Caller.SendAsync("ReceiveMessage", message);
    }
}