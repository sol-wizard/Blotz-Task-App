using System.Collections.Concurrent;
using BlotzTask.Services.GoalPlanner.Models;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Services.GoalPlanner;

public interface IConversationStateService
{
    public bool TryGetChatHistory(string conversationId, out ChatHistory chatHistory);
    public void SetChatHistory(string conversationId, ChatHistory chatHistory);
    public ClarificationState GetClarificationState(string conversationId);
    public void SetClarificationState(string conversationId, ClarificationState state);
}
public class ConversationStateServiceV2 : IConversationStateService
{
    private static readonly ConcurrentDictionary<string, ChatHistory> ConversationHistories = new();
    private static readonly ConcurrentDictionary<string, ClarificationState> ClarificationStates = new();
    // private static readonly ConcurrentDictionary<string, bool> _completedConversations = new();
    
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

    // public bool IsConversationCompleted(string conversationId)
    //     => _completedConversations.TryGetValue(conversationId, out var completed) && completed;
    //
    // public void MarkConversationCompleted(string conversationId)
    //     => _completedConversations[conversationId] = true;
    //
    // public void RemoveConversation(string conversationId)
    // {
    //     _conversationHistories.TryRemove(conversationId, out _);
    //     _clarificationStates.TryRemove(conversationId, out _);
    //     _completedConversations.TryRemove(conversationId, out _);
    // }
}