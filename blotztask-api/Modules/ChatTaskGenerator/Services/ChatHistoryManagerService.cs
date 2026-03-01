using BlotzTask.Modules.ChatTaskGenerator.Constants;
using BlotzTask.Modules.Labels.Queries;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.Users.Queries;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IChatHistoryManagerService
{
    void RemoveConversation();
    Task<ChatHistory> InitializeNewConversation(Guid userId);
    ChatHistory GetChatHistory();
}

public class ChatHistoryManagerService(
    ILogger<ChatHistoryManagerService> logger,
    GetAllLabelsQueryHandler getAllLabelsQueryHandler,
    GetUserPreferencesQueryHandler getUserPreferencesQueryHandler
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

    public async Task<ChatHistory> InitializeNewConversation(Guid userId)
    {
        if (_chatHistory != null) return await Task.FromResult(_chatHistory);

        // Fetch user preferences to get preferred language
        var userPreferencesQuery = new GetUserPreferencesQuery { UserId = userId };
        var userPreferences = await getUserPreferencesQueryHandler.Handle(userPreferencesQuery, CancellationToken.None);

        // Convert Language enum to a readable string for the AI
        var preferredLanguageString = userPreferences.PreferredLanguage switch
        {
            Language.En => "English",
            Language.Zh => "Chinese (Simplified)",
            _ => "English" // Default fallback
        };

        var chatHistory = new ChatHistory();

        chatHistory.AddSystemMessage(
            AiTaskGeneratorPrompts.GetSystemMessage(
                preferredLanguageString
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