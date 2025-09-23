using BlotzTask.Modules.ChatTaskGenerator.DTOs;
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface ITaskGenerateChatService
{
    Task<AiTaskGenerateChatResult> HandleUserMessageAsync(
        ConversationMessage userMessage,
        CancellationToken ct
    );
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
        string botContent;
        List<ExtractedTask>? tasks = null;

        // If there's no chathistory, create a new converstaion
        if (!_chatHistoryManagerService.TryGetChatHistory(out var chatHistory))
        {
            chatHistory = await _aiTaskGenerateService.InitializeNewConversation();
        }

        chatHistory.AddUserMessage(userMessage.Content);

        // TODO: Make the bot response more dynamic when there's no tasks generated,
        // considering getting it from the ai response

        var aiResponseTasks = await _aiTaskGenerateService.GenerateAiResponse(chatHistory, ct);
        if (aiResponseTasks.Count > 0)
        {
            tasks = aiResponseTasks;
            botContent = "If you're happy with these tasks, you can end the conversation.";
        }
        else
        {
            botContent =
                "I couldn't extract any tasks from your input. Please provide clear and actionable tasks.";
        }

        return new AiTaskGenerateChatResult
        {
            BotMessage = new ConversationMessage
            {
                Sender = "ChatBot",
                Content = botContent,
                Timestamp = DateTime.UtcNow,
                IsBot = true,
            },
            Tasks = tasks,
        };
    }
}
