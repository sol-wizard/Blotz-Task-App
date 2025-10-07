using BlotzTask.Modules.ChatTaskGenerator.Constants;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IChatHistoryManagerService
{
    bool TryGetChatHistory(out ChatHistory chatHistory);
    void SetChatHistory(ChatHistory chatHistory);
    void RemoveConversation();
    Task<ChatHistory> InitializeNewConversation();
    ChatHistory GetChatHistory();
}

public class ChatHistoryManagerService : IChatHistoryManagerService
{
    private static ChatHistory? _chatHistory;

    public ChatHistory GetChatHistory()
    {
        if (_chatHistory == null)
            throw new InvalidOperationException("Chat history has not been initialized.");
        return _chatHistory;
    }

    public bool TryGetChatHistory(out ChatHistory chatHistory)
    {
        if (_chatHistory != null)
        {
            chatHistory = _chatHistory;
            return true;
        }

        chatHistory = null!;
        return false;
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
        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(AiTaskGeneratorPrompts.GetSystemMessage(DateTime.Now));

        SetChatHistory(chatHistory);

        return Task.FromResult(chatHistory);
    }
}