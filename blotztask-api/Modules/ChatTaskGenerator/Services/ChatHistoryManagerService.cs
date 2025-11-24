using BlotzTask.Modules.ChatTaskGenerator.Constants;
using BlotzTask.Modules.Labels.Queries;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IChatHistoryManagerService
{
    void RemoveConversation();
    Task<ChatHistory> InitializeNewConversation(Guid userId, DateTimeOffset userLocalNow);
    ChatHistory GetChatHistory();
}

public class ChatHistoryManagerService(
    ILogger<ChatHistoryManagerService> logger,
    GetAllLabelsQueryHandler getAllLabelsQueryHandler
)
    : IChatHistoryManagerService
{
    private static ChatHistory? _chatHistory;

    public ChatHistory GetChatHistory()
    {
        if (_chatHistory == null)
            throw new InvalidOperationException("Chat history has not been initialized.");
        return _chatHistory;
    }

    public void RemoveConversation()
    {
        _chatHistory = null;
    }

    public async Task<ChatHistory> InitializeNewConversation(Guid userId, DateTimeOffset userLocalNow)
    {
        if (_chatHistory != null) return await Task.FromResult(_chatHistory);

        var chatHistory = new ChatHistory();
        

        chatHistory.AddSystemMessage(
            AiTaskGeneratorPrompts.GetSystemMessage(
                userLocalNow.DateTime,
                userLocalNow.DayOfWeek
            )
        );

        SetChatHistory(chatHistory);

        return await Task.FromResult(chatHistory);
    }


    public void SetChatHistory(ChatHistory chatHistory)
    {
        _chatHistory = chatHistory;
    }
}