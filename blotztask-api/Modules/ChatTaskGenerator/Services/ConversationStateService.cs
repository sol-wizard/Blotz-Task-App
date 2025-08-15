using System.Collections.Concurrent;
using BlotzTask.Modules.Chat.DTOs;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Modules.Chat.Services;

public interface IChatHistoryManagerService
{
    bool TryGetChatHistory(string conversationId, out ChatHistory chatHistory);
    void SetChatHistory(string conversationId, ChatHistory chatHistory);
    void RemoveConversation(string conversationId);
}

public class ChatHistoryManagerService : IChatHistoryManagerService
{
    private static readonly ConcurrentDictionary<string, ChatHistory> ConversationHistories = new();
    
    public bool TryGetChatHistory(string conversationId, out ChatHistory chatHistory)
        => ConversationHistories.TryGetValue(conversationId, out chatHistory);
    
    public void SetChatHistory(string conversationId, ChatHistory chatHistory)
        => ConversationHistories[conversationId] = chatHistory;

    public void RemoveConversation(string conversationId)
    {
        ConversationHistories.TryRemove(conversationId, out _);
    }
}