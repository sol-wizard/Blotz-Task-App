using BlotzTask.Modules.Chat.DTOs;
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.Chat.Services;
public interface IGoalPlannerChatService
{
    Task<GoalPlanningChatResult> HandleUserMessageAsync(ConversationMessage userMessage);
}

public class GoalPlannerChatService : IGoalPlannerChatService
{
    private const int MaxClarificationRounds = 3;

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

        if (!_conversationStateService.TryGetChatHistory(conversationId, out var chatHistory))
        {
            chatHistory = await _goalPlannerAiService.InitializeNewConversation(conversationId);
            _conversationStateService.SetChatHistory(conversationId, chatHistory);
        }

        chatHistory.AddUserMessage(userMessage.Content);

        var state = _conversationStateService.GetClarificationState(conversationId);
        var isReady = await _goalPlannerAiService.IsReadyToGeneratePlanAsync(chatHistory, state.ClarificationRound);

        string botContent;
        List<ExtractedTaskDto>? tasks = null;

        if (!isReady && state.ClarificationRound >= MaxClarificationRounds)
        {
            botContent = "Sorry, I couldn't generate a helpful task plan based on the information provided. You can try restating your goal with more details.";
            state.ClarificationRound = 0;
            _conversationStateService.SetConversationComplete(conversationId, true);
        }
        else if (!isReady)
        {
            botContent = await _goalPlannerAiService.GenerateClarifyingQuestionAsync(chatHistory, state.ClarificationRound);
            state.ClarificationRound++;
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

            state.ClarificationRound = 0;
        }

        _conversationStateService.SetClarificationState(conversationId, state);

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
    
    private bool UserExplicitlyEndedConversation(string message)
    {
        var lower = message.ToLowerInvariant();
        return lower.Contains("end this") || lower.Contains("that's all");
    }

}