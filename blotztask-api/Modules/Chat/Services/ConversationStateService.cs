using System.Collections.Concurrent;
using BlotzTask.Modules.Chat.DTOs;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Modules.Chat.Services;

public interface IConversationStateService
{
    bool TryGetChatHistory(string conversationId, out ChatHistory chatHistory);
    void SetChatHistory(string conversationId, ChatHistory chatHistory);
    ClarificationState GetClarificationState(string conversationId);
    void SetClarificationState(string conversationId, ClarificationState state);
    bool IsConversationComplete(string conversationId);
    void SetConversationComplete(string conversationId, bool isComplete);
    void RemoveConversation(string conversationId);
}
//TODO: Rename this service to "ConversationStateService" without V2
public class ConversationStateServiceV2 : IConversationStateService
{
    private static readonly ConcurrentDictionary<string, ChatHistory> ConversationHistories = new();
    private static readonly ConcurrentDictionary<string, ClarificationState> ClarificationStates = new();
    private static readonly ConcurrentDictionary<string, bool> ConversationCompletionStatus = new();
    
    public bool TryGetChatHistory(string conversationId, out ChatHistory chatHistory)
        => ConversationHistories.TryGetValue(conversationId, out chatHistory);
    
    public void SetChatHistory(string conversationId, ChatHistory chatHistory)
        => ConversationHistories[conversationId] = chatHistory;

    public ClarificationState GetClarificationState(string conversationId)
    {
        return ClarificationStates.TryGetValue(conversationId, out var state)
            ? state
            : new ClarificationState(); // default fallback
    }

    public void SetClarificationState(string conversationId, ClarificationState state)
        => ClarificationStates[conversationId] = state;

    public bool IsConversationComplete(string conversationId)
        => ConversationCompletionStatus.TryGetValue(conversationId, out var isComplete) && isComplete;

    public void SetConversationComplete(string conversationId, bool isComplete)
        => ConversationCompletionStatus[conversationId] = isComplete;

    public void RemoveConversation(string conversationId)
    {
        ConversationHistories.TryRemove(conversationId, out _);
        ClarificationStates.TryRemove(conversationId, out _);
        ConversationCompletionStatus.TryRemove(conversationId, out _);
    }
}