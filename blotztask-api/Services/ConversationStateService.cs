using System.Collections.Concurrent;
using Microsoft.SemanticKernel.ChatCompletion;

public class ConversationStateService
{
    private static readonly ConcurrentDictionary<string, ChatHistory> _conversationHistories = new();
    private static readonly ConcurrentDictionary<string, ClarificationState> _clarificationStates = new();
    private static readonly ConcurrentDictionary<string, bool> _completedConversations = new();

    public class ClarificationState
    {
        public int ClarificationRound { get; set; }
        public string OriginalGoal { get; set; } = string.Empty;
        public List<string> ClarificationAnswers { get; } = [];
    }

    public bool TryGetChatHistory(string conversationId, out ChatHistory chatHistory)
    => _conversationHistories.TryGetValue(conversationId, out chatHistory);

    public void AddChatHistory(string conversationId, ChatHistory chatHistory)
        => _conversationHistories[conversationId] = chatHistory;

    public bool TryGetClarificationState(string conversationId, out ClarificationState state)
        => _clarificationStates.TryGetValue(conversationId, out state);

    public void AddClarificationState(string conversationId, ClarificationState state)
        => _clarificationStates[conversationId] = state;

    public bool IsConversationCompleted(string conversationId)
        => _completedConversations.TryGetValue(conversationId, out var completed) && completed;

    public void MarkConversationCompleted(string conversationId)
        => _completedConversations[conversationId] = true;

    public void RemoveConversation(string conversationId)
    {
        _conversationHistories.TryRemove(conversationId, out _);
        _clarificationStates.TryRemove(conversationId, out _);
        _completedConversations.TryRemove(conversationId, out _);
    }
}