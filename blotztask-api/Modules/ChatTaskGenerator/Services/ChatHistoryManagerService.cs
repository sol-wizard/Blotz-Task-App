using BlotzTask.Modules.ChatTaskGenerator.Constants;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IChatHistoryManagerService
{
    void SetChatHistory(ChatHistory chatHistory);
    void RemoveConversation();
    Task<ChatHistory> InitializeNewConversation();
    ChatHistory GetChatHistory();
}

public class ChatHistoryManagerService : IChatHistoryManagerService
{
    private static ChatHistory? _chatHistory;
    private readonly ILogger<ChatHistoryManagerService> _logger;

    public ChatHistoryManagerService(ILogger<ChatHistoryManagerService> logger)
    {
        _logger = logger;
    }

    public ChatHistory GetChatHistory()
    {
        if (_chatHistory == null)
            throw new InvalidOperationException("Chat history has not been initialized.");
        return _chatHistory;
    }


    public void SetChatHistory(ChatHistory chatHistory)
    {
        _chatHistory = chatHistory;
    }

    public void RemoveConversation()
    {
        _chatHistory = null;
    }

    public Task<ChatHistory> InitializeNewConversation()
    {
        if (_chatHistory != null) return Task.FromResult(_chatHistory);


        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(AiTaskGeneratorPrompts.GetSystemMessage(DateTime.Now));

        SetChatHistory(chatHistory);

        return Task.FromResult(chatHistory);
    }
}