using BlotzTask.Modules.ChatTaskGenerator.DTOs;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Shared.Exceptions;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.ChatTaskGenerator;

public class AiTaskGenerateChatHub : Hub
{
    private readonly ILogger<AiTaskGenerateChatHub> _logger;
    private readonly ITaskGenerateChatService _taskGenerateChatService;

    public AiTaskGenerateChatHub(
        ILogger<AiTaskGenerateChatHub> logger,
        ITaskGenerateChatService taskGenerateChatService
    )
    {
        _logger = logger;
        _taskGenerateChatService = taskGenerateChatService;
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
        _logger.LogInformation(
            $"User disconnected: {connectionId}. Exception: {exception?.Message}"
        );
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(string user, string message)
    {
        var userMsg = new ConversationMessage
        {
            Sender = user,
            Content = message,
            Timestamp = DateTime.UtcNow,
            IsBot = false,
        };

        await Clients.Caller.SendAsync("ReceiveMessage", userMsg);

        // Send BotTyping signal to clients
        await Clients.Caller.SendAsync("BotTyping", true);

        try
        {
            CancellationToken ct = Context.ConnectionAborted;
            var result = await _taskGenerateChatService.HandleUserMessageAsync(userMsg, ct);

            if (result.Tasks != null)
            {
                await Clients.Caller.SendAsync("ReceiveTasks", result.Tasks);
            }

            await Clients.Caller.SendAsync("ReceiveMessage", result.BotMessage);
            await Clients.Caller.SendAsync("BotTyping", false);
        }
        catch (TokenLimitExceededException ex)
        {
            _logger.LogError(ex, "Token limit exceeded: {Message}", ex.Message);

            await Clients.Caller.SendAsync("BotTyping", false);

            await Clients.Caller.SendAsync(
                "TokenLimitExceeded",
                new { errorType = "TokenLimitExceeded", message = ex.Message }
            );
        }
    }
}
