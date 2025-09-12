using BlotzTask.Modules.ChatTaskGenerator.DTOs;
using BlotzTask.Shared.DTOs;
using BlotzTask.Shared.Store;
using BlotzTask.Shared.Utils;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface ITaskGenerateChatService
{
    Task<AiTaskGenerateChatResult> HandleUserMessageAsync(
        ConversationMessage userMessage,
        string conversationId,
        CancellationToken ct
    );
}

public class TaskGenerateChatService : ITaskGenerateChatService
{
    private readonly IAiTaskGenerateService _aiTaskGenerateService;
    private readonly ChatHistoryStore _chatHistoryStore;

    public TaskGenerateChatService(
        IAiTaskGenerateService aiTaskGenerateService,
        ChatHistoryStore chatHistoryStore
    )
    {
        _aiTaskGenerateService = aiTaskGenerateService;
        _chatHistoryStore = chatHistoryStore;
    }

    public async Task<AiTaskGenerateChatResult> HandleUserMessageAsync(
        ConversationMessage userMessage,
        string conversationId,
        CancellationToken ct
    )
    {
        string botContent;
        List<ExtractedTask>? tasks = null;

        var chatHistory = _chatHistoryStore.GetOrCreate(AiGenerateTaskChatKeyBuilder.BuildKey(conversationId));

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
            IsConversationComplete = false,
            Tasks = tasks,
        };
    }
}
