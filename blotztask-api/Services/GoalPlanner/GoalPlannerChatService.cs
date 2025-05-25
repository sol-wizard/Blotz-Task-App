using BlotzTask.Services.GoalPlanner.Constants;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Services.GoalPlanner;

public interface IGoalPlannerChatService
{
    Task<string> GenerateAiResponse(ChatHistory chatHistory);
    ChatHistory InitializeNewConversation(string conversationId);
}

public class GoalPlannerChatService : IGoalPlannerChatService
{
    private readonly ILabelService _labelService;
    private readonly IChatCompletionService _chatCompletionService;

    private const int MaxClarificationRounds = 3;

    public GoalPlannerChatService(
        ILabelService labelService, 
        IChatCompletionService chatCompletionService)
    {
        _labelService = labelService;
        _chatCompletionService = chatCompletionService;
    }
    public async Task<string> GenerateAiResponse(ChatHistory chatHistory)
    {
        var result = await _chatCompletionService.GetChatMessageContentAsync(chatHistory);
        
        return result.Content;
    }
    
    public ChatHistory InitializeNewConversation(string conversationId)
    {
        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(string.Format(GoalPlannerPrompts.SystemMessageTemplate,
            DateTime.UtcNow, MaxClarificationRounds, string.Join(", ", GetLabelNamesAsync())));
        // _stateService.AddChatHistory(conversationId, chatHistory);
        return chatHistory;
    }
    
    private async Task<List<string>> GetLabelNamesAsync()
    {
        var labels = await _labelService.GetAllLabelsAsync();
        return labels.Select(label => label.Name).ToList();
    }
}

