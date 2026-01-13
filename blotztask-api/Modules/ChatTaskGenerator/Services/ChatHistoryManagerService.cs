using BlotzTask.Modules.ChatTaskGenerator.Constants;
using Microsoft.SemanticKernel.ChatCompletion;
using BlotzTask.Shared.Store;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IChatHistoryManagerService
{
    void RemoveConversation(string connectionId);
    Task<ChatHistory> InitializeNewConversation(string connectionId, Guid userId, DateTimeOffset userLocalNow);
    ChatHistory GetChatHistory(string connectionId);
}

public class ChatHistoryManagerService(
    ChatHistoryStore chatHistoryStore
)
    : IChatHistoryManagerService
{
    public ChatHistory GetChatHistory(string connectionId)
    {
        if (!chatHistoryStore.TryGet(connectionId, out var history) || history is null)
        {
            throw new InvalidOperationException("Chat history has not been initialized for this connection.");
        }

        return history;
    }

    public void RemoveConversation(string connectionId)
    {
        chatHistoryStore.Remove(connectionId);
    }

    public async Task<ChatHistory> InitializeNewConversation(string connectionId, Guid userId, DateTimeOffset userLocalNow)
    {
        // Ensure per-connection isolation (SignalR ConnectionId).
        var chatHistory = chatHistoryStore.GetOrCreate(connectionId);

        // Only add the system message once per new chat history.
        if (chatHistory.Count == 0)
        {
            chatHistory.AddSystemMessage(
                AiTaskGeneratorPrompts.GetSystemMessage(
                    userLocalNow.DateTime,
                    userLocalNow.DayOfWeek
                )
            );
        }

        return await Task.FromResult(chatHistory);
    }
}