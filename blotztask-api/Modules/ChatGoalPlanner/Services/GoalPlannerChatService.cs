using BlotzTask.Modules.GoalPlannerChat.Dtos;
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.GoalPlannerChat.Services;
public interface IGoalPlannerChatService
{
    Task<GoalPlanningChatResult> HandleUserMessageAsync(ConversationMessage userMessage);
}

public class GoalPlannerChatService : IGoalPlannerChatService
{
    private readonly IGoalPlannerAiService _goalPlannerAiService;
    private readonly IConversationStateService _conversationStateService;

    public GoalPlannerChatService(
        IGoalPlannerAiService goalPlannerAiService,
        IConversationStateService conversationStateService)
    {
        _goalPlannerAiService = goalPlannerAiService;
        _conversationStateService = conversationStateService;
    }

    public async Task<GoalPlanningChatResult> HandleUserMessageAsync(ConversationMessage userMessage)
    {
        var conversationId = userMessage.ConversationId;

        if (UserExplicitlyEndedConversation(userMessage.Content))
        {
            return EndConversation(conversationId); 
        }
        
        // If there's no chathistory, create a new converstaion
        if (!_conversationStateService.TryGetChatHistory(conversationId, out var chatHistory))
        {
            chatHistory = await _goalPlannerAiService.InitializeNewConversation(conversationId);
            _conversationStateService.SetChatHistory(conversationId, chatHistory);
        }

        chatHistory.AddUserMessage(userMessage.Content);
        
        var isReady = await _goalPlannerAiService.IsReadyToGeneratePlanAsync(chatHistory);

        string botContent;
        List<ExtractedTaskGoalPlanner>? tasks = null;
        
        if (!isReady)
        {
            botContent = await _goalPlannerAiService.GenerateClarifyingQuestionAsync(chatHistory);
        }
        else
        {
            var aiResponseTasks = await _goalPlannerAiService.GenerateAiResponse(chatHistory);
            if (aiResponseTasks != null && aiResponseTasks.Count > 0)
            {
                var revisedTasks = await _goalPlannerAiService.ReviseGeneratedTasksAsync(aiResponseTasks, chatHistory);

                tasks = revisedTasks;
                botContent = "If you're happy with these tasks, you can type **end this** to end the conversation.";
            }
            else
            {
                botContent = "No tasks could be generated.";
            }
            
        }

        return new GoalPlanningChatResult
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

    private GoalPlanningChatResult EndConversation(string conversationId)
    {
        _conversationStateService.RemoveConversation(conversationId);

        return new GoalPlanningChatResult
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