using BlotzTask.Modules.ChatTaskGenerator;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Shared.Exceptions;
using Microsoft.AspNetCore.SignalR;

public interface IChatMessageProcessor
{
    Task ProcessUserTextAsync(Guid userId, string conversationId, string message, CancellationToken ct);
    Task ProcessFromHistoryAsync(string conversationId, CancellationToken ct);
}

public sealed class ChatMessageProcessor : IChatMessageProcessor
{
    private readonly IAiTaskGenerateService _aiTaskGenerateService;
    private readonly IChatHistoryManagerService _chatHistoryManagerService;
    private readonly IHubContext<AiTaskGenerateChatHub> _hub;

    public ChatMessageProcessor(
        IChatHistoryManagerService chatHistoryManagerService,
        IAiTaskGenerateService aiTaskGenerateService,
        IHubContext<AiTaskGenerateChatHub> hub)
    {
        _chatHistoryManagerService = chatHistoryManagerService;
        _aiTaskGenerateService = aiTaskGenerateService;
        _hub = hub;
    }

    public async Task ProcessUserTextAsync(Guid userId, string conversationId, string message, CancellationToken ct)
    {
        var chatHistory = _chatHistoryManagerService.GetChatHistory();

        chatHistory.AddUserMessage(message);

        await ProcessFromHistoryAsync(conversationId, ct);
    }

    public async Task ProcessFromHistoryAsync(string conversationId, CancellationToken ct)
    {
        try
        {
            var resultMessage = await _aiTaskGenerateService.GenerateAiResponse(ct);

            await _hub.Clients.Group(conversationId).SendAsync("ReceiveMessage", resultMessage, ct);
        }
        catch (AiTaskGenerationException ex)
        {
            var aiServiceError = new AiGenerateMessage
            {
                IsSuccess = false,
                ErrorMessage = ex.Message
            };
            await _hub.Clients.Group(conversationId).SendAsync("ReceiveMessage", aiServiceError, ct);
        }
    }
}
