using BlotzTask.Models.GoalToTask;
using BlotzTask.Services.GoalPlanner.Models;

namespace BlotzTask.Services.GoalPlanner;
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

        if (!_conversationStateService.TryGetChatHistory(conversationId, out var chatHistory))
        {
            chatHistory = await _goalPlannerAiService.InitializeNewConversation(conversationId);
            _conversationStateService.SetChatHistory(conversationId, chatHistory);
        }

        chatHistory.AddUserMessage(userMessage.Content);

        var state = _conversationStateService.GetClarificationState(conversationId);
        var isReady = await _goalPlannerAiService.IsReadyToGeneratePlanAsync(chatHistory);

        string botContent;
        bool isComplete = false;

        if (!isReady && state.ClarificationRound >= MaxClarificationRounds)
        {
            botContent = "Sorry, I couldn't generate a helpful task plan based on the information provided. You can try restating your goal with more details.";
            state.ClarificationRound = 0;
            isComplete = true;
        }
        else if (!isReady)
        {
            botContent = await _goalPlannerAiService.GenerateClarifyingQuestionAsync(chatHistory);
            state.ClarificationRound++;
        }
        else
        {
            botContent = await _goalPlannerAiService.GenerateAiResponse(chatHistory);
            state.ClarificationRound = 0;
            isComplete = true;
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
                IsBot = true
            },
            IsConversationComplete = isComplete
        };
    }
}