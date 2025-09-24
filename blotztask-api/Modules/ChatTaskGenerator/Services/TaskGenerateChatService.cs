using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface ITaskGenerateChatService
{
    Task<List<ExtractedTask>?> HandleUserMessageAsync(
        string userMessage,
        CancellationToken ct
    );
}

public class TaskGenerateChatService : ITaskGenerateChatService
{
    private readonly IAiTaskGenerateService _aiTaskGenerateService;
    private readonly IChatHistoryManagerService _chatHistoryManagerService;

    public TaskGenerateChatService(
        IAiTaskGenerateService aiTaskGenerateService,
        IChatHistoryManagerService chatHistoryManagerService
    )
    {
        _aiTaskGenerateService = aiTaskGenerateService;
        _chatHistoryManagerService = chatHistoryManagerService;
    }

    public async Task<List<ExtractedTask>?> HandleUserMessageAsync(
        string userMessage,
        CancellationToken ct
    )
    {
        // If there's no chat history, create a new converstaion
        if (!_chatHistoryManagerService.TryGetChatHistory(out var chatHistory))
        {
            chatHistory = await _aiTaskGenerateService.InitializeNewConversation();
        }

        chatHistory.AddUserMessage(userMessage);

        return await _aiTaskGenerateService.GenerateAiResponse(chatHistory, ct);
    }
}
