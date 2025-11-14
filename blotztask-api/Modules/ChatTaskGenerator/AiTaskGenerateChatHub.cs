using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Shared.Exceptions;
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
        await _chatHistoryManagerService.InitializeNewConversation();
        await base.OnConnectedAsync();
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
            var resultMessage = await _aiTaskGenerateService.GenerateAiResponse(ct);

            await Clients.Caller.SendAsync("ReceiveMessage", resultMessage);
        }
        catch (AiTaskGenerationException ex)
        {
            var aiServiceError = new AiGenerateMessage
            {
                IsSuccess = false,
                ErrorMessage = ex.Message
            };
            await Clients.Caller.SendAsync("ReceiveMessage", aiServiceError);
        }
        
    }
}