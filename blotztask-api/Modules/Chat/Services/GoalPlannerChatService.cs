using BlotzTask.Modules.Chat.DTOs;
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.Chat.Services;
public interface IGoalPlannerChatService
{
    Task<AiTaskGenerateChatResult> HandleUserMessageAsync(ConversationMessage userMessage);
}

public class GoalPlannerChatService : IGoalPlannerChatService
{
    private readonly IAiTaskGenerateService _aiTaskGenerateService;
    private readonly IConversationStateService _conversationStateService;

    public GoalPlannerChatService(
        IAiTaskGenerateService aiTaskGenerateService,
        IConversationStateService conversationStateService)
    {
        _aiTaskGenerateService = aiTaskGenerateService;
        _conversationStateService = conversationStateService;
    }

    public async Task<AiTaskGenerateChatResult> HandleUserMessageAsync(ConversationMessage userMessage)
    {
        var conversationId = userMessage.ConversationId;

        if (UserExplicitlyEndedConversation(userMessage.Content))
        {
            return EndConversation(conversationId); 
        }
        
        // If there's no chathistory, create a new converstaion
        if (!_conversationStateService.TryGetChatHistory(conversationId, out var chatHistory))
        {
            chatHistory = await _aiTaskGenerateService.InitializeNewConversation(conversationId);
            _conversationStateService.SetChatHistory(conversationId, chatHistory);
        }

        chatHistory.AddUserMessage(userMessage.Content);
        
        var isReady = await _aiTaskGenerateService.IsReadyToGeneratePlanAsync(chatHistory);

        string botContent;
        List<ExtractedTaskDto>? tasks = null;
        
        if (!isReady)
        {
            botContent = await _aiTaskGenerateService.GenerateClarifyingQuestionAsync(chatHistory);
        }
        else
        {
            var aiResponseTasks = await _aiTaskGenerateService.GenerateAiResponse(chatHistory);
            if (aiResponseTasks != null && aiResponseTasks.Count > 0)
            {
                var revisedTasks = await _aiTaskGenerateService.ReviseGeneratedTasksAsync(aiResponseTasks, chatHistory);

                tasks = revisedTasks;
                botContent = "If you're happy with these tasks, you can type **end this** to end the conversation.";
            }
            else
            {
                botContent = "No tasks could be generated.";
            }
            
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
        _conversationStateService.RemoveConversation(conversationId);

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