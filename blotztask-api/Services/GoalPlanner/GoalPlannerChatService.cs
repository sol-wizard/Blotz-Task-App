using BlotzTask.Services.GoalPlanner.Constants;
using BlotzTask.Services.GoalPlanner.Models;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Services.GoalPlanner;

public interface IGoalPlannerChatService
{
    Task<string> GenerateAiResponse(ChatHistory chatHistory);
    Task<ChatHistory> InitializeNewConversation(string conversationId);
    Task<bool> IsReadyToGeneratePlanAsync(ChatHistory originalChatHistory);
    Task<string> GenerateClarifyingQuestionAsync(ChatHistory originalChatHistory);
}

public class GoalPlannerChatService : IGoalPlannerChatService
{
    private readonly ILabelService _labelService;
    private readonly IChatCompletionService _chatCompletionService;
    private readonly IConversationStateService _conversationStateService;
    
    private const int MaxClarificationRounds = 3;

    public GoalPlannerChatService(
        ILabelService labelService, 
        IChatCompletionService chatCompletionService,
        IConversationStateService conversationStateService)
    {
        _labelService = labelService;
        _chatCompletionService = chatCompletionService;
        _conversationStateService = conversationStateService;
    }
    public async Task<string> GenerateAiResponse(ChatHistory chatHistory)
    {
        var result = await _chatCompletionService.GetChatMessageContentAsync(chatHistory);
        Console.WriteLine($"AI result: {result.Content}");
        return result.Content;
    }
    
    public async Task<ChatHistory> InitializeNewConversation(string conversationId)
    {
        var labelNames = await GetLabelNamesAsync();

        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(string.Format(GoalPlannerPrompts.SystemMessageTemplate,
            DateTime.UtcNow, MaxClarificationRounds, string.Join(", ", labelNames)));
        
        // Setting initial state needed for goal planner AI to work properly
        _conversationStateService.SetChatHistory(conversationId, chatHistory);
        _conversationStateService.SetClarificationState(conversationId, new ClarificationState());

        return chatHistory;
    }
    
    public async Task<bool> IsReadyToGeneratePlanAsync(ChatHistory originalChatHistory)
    {
        // Create a temporary copy
        var analysisHistory = new ChatHistory();

        // Copy all messages, including system prompts
        foreach (var message in originalChatHistory)
        {
            analysisHistory.AddMessage(message.Role, message.Content);
        }

        // Add analysis-specific system prompt only to the cloned history
        const string analysisPrompt = @"
You are reviewing a user's goal and clarification history.
Based on what the user has said so far, do you have enough clear, specific, and complete information to create a helpful step-by-step task plan?

Respond with one word only: YES or NO.";

        analysisHistory.AddSystemMessage(analysisPrompt);

        var result = await _chatCompletionService.GetChatMessageContentAsync(analysisHistory);
        var response = result?.Content?.Trim().ToUpperInvariant();

        Console.WriteLine($"AI readiness response: {response}");

        return response == "YES";
    }
    
    public async Task<string> GenerateClarifyingQuestionAsync(ChatHistory originalChatHistory)
    {
        // Clone the original chat history
        var clarificationHistory = new ChatHistory();

        foreach (var message in originalChatHistory)
        {
            clarificationHistory.AddMessage(message.Role, message.Content);
        }

        // Add system prompt that instructs AI to ask one clarifying question
        const string clarifyPrompt = @"
You are a helpful assistant helping users define their goals clearly.

Based on the conversation so far, ask ONE clarifying question that would help turn the user’s vague or incomplete goal into something that can be broken down into step-by-step tasks.

Important:
- Ask only ONE specific question.
- The question should address the most important missing detail.
- Be friendly, concise, and supportive.

Today’s date: {0:yyyy-MM-dd}.
";

        clarificationHistory.AddSystemMessage(string.Format(clarifyPrompt, DateTime.UtcNow));

        var result = await _chatCompletionService.GetChatMessageContentAsync(clarificationHistory);
        var response = result?.Content?.Trim();

        Console.WriteLine($"AI clarification question: {response}");

        return response ?? "Can you clarify your goal a bit more?";
    }
    
    private async Task<List<string>> GetLabelNamesAsync()
    {
        var labels = await _labelService.GetAllLabelsAsync();
        return labels.Select(label => label.Name).ToList();
    }
}

