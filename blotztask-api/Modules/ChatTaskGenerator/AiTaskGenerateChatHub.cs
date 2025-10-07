using BlotzTask.Modules.ChatTaskGenerator.Services;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.ChatTaskGenerator;

public class AiTaskGenerateChatHub : Hub
{
    private readonly IAiTaskGenerateService _aiTaskGenerateService;
    private readonly IChatHistoryManagerService _chatHistoryManagerService;
    private readonly ILogger<AiTaskGenerateChatHub> _logger;


    public AiTaskGenerateChatHub(
        ILogger<AiTaskGenerateChatHub> logger,
        IChatHistoryManagerService chatHistoryManagerService,
        IAiTaskGenerateService aiTaskGenerateService
    )
    {
        _logger = logger;
        _chatHistoryManagerService = chatHistoryManagerService;
        _aiTaskGenerateService = aiTaskGenerateService;
    }

    public override async Task OnConnectedAsync()
    {
        try
        {
            await _chatHistoryManagerService.InitializeNewConversation();
            await base.OnConnectedAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "OnConnectedAsync crashed for {cid}", Context.ConnectionId);
            throw;
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        _logger.LogInformation(
            $"User disconnected: {connectionId}. Exception: {exception?.Message}"
        );
        _chatHistoryManagerService.RemoveConversation();
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(string user, string message)
    {
        try
        {
            var ct = Context.ConnectionAborted;
            var chatHistory = _chatHistoryManagerService.GetChatHistory();

            chatHistory.AddUserMessage(message);
            var receiveMessage = await _aiTaskGenerateService.GenerateAiResponse(ct);

            if (receiveMessage != null) await Clients.Caller.SendAsync("ReceiveTasks", receiveMessage);
        }

        catch (Exception ex)
        {
            _logger.LogError(ex, "💥 SendMessage crashed for user={user}", user);
            throw;
        }
    }
}