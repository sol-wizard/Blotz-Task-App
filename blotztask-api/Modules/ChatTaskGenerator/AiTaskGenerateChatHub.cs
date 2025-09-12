using BlotzTask.Modules.ChatTaskGenerator.DTOs;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Shared.Exceptions;
using BlotzTask.Shared.Store;
using BlotzTask.Shared.Utils;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.ChatTaskGenerator;

public class AiTaskGenerateChatHub : Hub
{
    private readonly ILogger<AiTaskGenerateChatHub> _logger;
    private readonly ITaskGenerateChatService _taskGenerateChatService;
    private readonly ChatHistoryStore _chatHistoryStore;

    public AiTaskGenerateChatHub(
        ILogger<AiTaskGenerateChatHub> logger,
        ITaskGenerateChatService taskGenerateChatService,
        ChatHistoryStore chatHistoryStore
    )
    {
        _logger = logger;
        _taskGenerateChatService = taskGenerateChatService;
        _chatHistoryStore = chatHistoryStore;
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
        _chatHistoryStore.Remove(AiGenerateTaskChatKeyBuilder.BuildKey(Context.ConnectionId));
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
            var conversationId = Context.Items["ConversationId"] as string;
            var result = await _taskGenerateChatService.HandleUserMessageAsync(userMsg, conversationId, ct);

            if (result.IsConversationComplete)
            {
                await Clients.Caller.SendAsync("ReceiveMessage", result.BotMessage);
                await Clients.Caller.SendAsync("BotTyping", false);
                await Clients.Caller.SendAsync("ConversationCompleted");
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
            _logger.LogError(ex, "Token limit exceeded: {Message}", ex.Message);

            await Clients.Caller.SendAsync("BotTyping", false);

            await Clients.Caller.SendAsync(
                "TokenLimitExceeded",
                new { errorType = "TokenLimitExceeded", message = ex.Message }
            );
        }
    }
}
