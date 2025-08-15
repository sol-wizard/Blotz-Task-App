using System.Collections.Concurrent;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Modules.GoalPlannerChat.Services;

public interface IConversationStateService
{
    bool TryGetChatHistory(string conversationId, out ChatHistory chatHistory);
    void SetChatHistory(string conversationId, ChatHistory chatHistory);
    void RemoveConversation(string conversationId);
}

public class ConversationStateService: IConversationStateService
{
    private static readonly ConcurrentDictionary<string, ChatHistory> ConversationHistories = new();
    private static readonly ConcurrentDictionary<string, bool> ConversationCompletionStatus = new();
    
    public bool TryGetChatHistory(string conversationId, out ChatHistory chatHistory)
        => ConversationHistories.TryGetValue(conversationId, out chatHistory);
    
    public void SetChatHistory(string conversationId, ChatHistory chatHistory)
        => ConversationHistories[conversationId] = chatHistory;
    
    public bool IsConversationComplete(string conversationId)
        => ConversationCompletionStatus.TryGetValue(conversationId, out var isComplete) && isComplete;

    public void SetConversationComplete(string conversationId, bool isComplete)
        => ConversationCompletionStatus[conversationId] = isComplete;

    public void RemoveConversation(string conversationId)
    {
        ConversationHistories.TryRemove(conversationId, out _);
        ConversationCompletionStatus.TryRemove(conversationId, out _);
    }
}