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
        try
        {
            CancellationToken ct = Context.ConnectionAborted;
            var recieveTasks = await _taskGenerateChatService.HandleUserMessageAsync(message, ct);

            if (recieveTasks != null)
            {
                await Clients.Caller.SendAsync("ReceiveTasks", recieveTasks);
            }
        }
        catch (TokenLimitExceededException ex)
        {
            _logger.LogError(ex, "Token limit exceeded: {Message}", ex.Message);
        }
    }
}
