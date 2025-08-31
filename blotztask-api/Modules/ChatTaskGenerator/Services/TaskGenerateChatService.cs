using BlotzTask.Modules.Chat.DTOs;
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.Chat.Services;

public interface ITaskGenerateChatService
{
    Task<AiTaskGenerateChatResult> HandleUserMessageAsync(ConversationMessage userMessage, CancellationToken ct);
}

public class TaskGenerateChatService : ITaskGenerateChatService
{
    private readonly IAiTaskGenerateService _aiTaskGenerateService;
    private readonly IChatHistoryManagerService _chatHistoryManagerService;

    public TaskGenerateChatService(
        IAiTaskGenerateService aiTaskGenerateService,
        IChatHistoryManagerService chatHistoryManagerService
    )
    {
        _aiTaskGenerateService = aiTaskGenerateService;
        _chatHistoryManagerService = chatHistoryManagerService;
    }

    public async Task<AiTaskGenerateChatResult> HandleUserMessageAsync(
        ConversationMessage userMessage,
        CancellationToken ct
    )
    {
        var conversationId = userMessage.ConversationId;
        string botContent;
        List<ExtractedTask>? tasks = null;

        if (UserExplicitlyEndedConversation(userMessage.Content))
        {
            return EndConversation(conversationId);
        }

        // If there's no chathistory, create a new converstaion
        if (!_chatHistoryManagerService.TryGetChatHistory(conversationId, out var chatHistory))
        {
            chatHistory = await _aiTaskGenerateService.InitializeNewConversation(conversationId);
            _chatHistoryManagerService.SetChatHistory(conversationId, chatHistory);
        }

        chatHistory.AddUserMessage(userMessage.Content);

        // TODO: Make the bot response more dynamic when there's no tasks generated,
        // considering getting it from the ai response

        var aiResponseTasks = await _aiTaskGenerateService.GenerateAiResponse(chatHistory, ct);
        if (aiResponseTasks == null)
        {
            // No tasks were generated at all
            botContent =
                "I couldn't extract any tasks from your input. Please provide clear and actionable tasks.";
        }
        else if (aiResponseTasks.Count > 0)
        {
            tasks = aiResponseTasks;
            botContent =
                "If you're happy with these tasks, you can type **end this** to end the conversation.";
        }
        else
        {
            // The tasks generated are not actionable or too generic so they didn't pass the revision
            botContent = "No tasks could be generated.";
        }

        return new AiTaskGenerateChatResult
        {
            BotMessage = new ConversationMessage
            {
                Sender = "ChatBot",
                Content = botContent,
                ConversationId = conversationId,
                Timestamp = DateTime.UtcNow,
                IsBot = true,
            },
            IsConversationComplete = false,
            Tasks = tasks,
        };
    }

    private AiTaskGenerateChatResult EndConversation(string conversationId)
    {
        _chatHistoryManagerService.RemoveConversation(conversationId);

        return new AiTaskGenerateChatResult
        {
            BotMessage = new ConversationMessage
            {
                Sender = "ChatBot",
                Content = "Okay, your plan is complete. You can start a new one anytime.",
                ConversationId = conversationId,
                Timestamp = DateTime.UtcNow,
                IsBot = true,
            },
            IsConversationComplete = true,
            Tasks = null,
        };
    }

    // TODO: Change this to a more robust solution
    private bool UserExplicitlyEndedConversation(string message)
    {
        var lower = message.ToLowerInvariant();
        return lower.Contains("end this") || lower.Contains("that's all");
    }
}
