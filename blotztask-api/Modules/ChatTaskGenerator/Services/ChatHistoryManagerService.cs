using System.Collections.Concurrent;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IChatHistoryManagerService
{
    bool TryGetChatHistory(out ChatHistory chatHistory);
    void SetChatHistory(ChatHistory chatHistory);
    void RemoveConversation();
}

public class ChatHistoryManagerService : IChatHistoryManagerService
{
    private static ChatHistory? _chatHistory;
    
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
}