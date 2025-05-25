using BlotzTask.Services.GoalPlanner.Constants;
using BlotzTask.Services.GoalPlanner.Models;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Services.GoalPlanner;

public interface IGoalPlannerAiService
{
    Task<string> GenerateAiResponse(ChatHistory chatHistory);
    Task<ChatHistory> InitializeNewConversation(string conversationId);
    Task<bool> IsReadyToGeneratePlanAsync(ChatHistory originalChatHistory);
    Task<string> GenerateClarifyingQuestionAsync(ChatHistory originalChatHistory);
}

public class GoalPlannerAiService : IGoalPlannerAiService
{
    private readonly ILabelService _labelService;
    private readonly IChatCompletionService _chatCompletionService;
    private readonly IConversationStateService _conversationStateService;
    
    private const int MaxClarificationRounds = 3;

    public GoalPlannerAiService(
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
    
    /// <summary>
    /// Initializes a new conversation session by creating a chat history with a system prompt
    /// that instructs the AI how to behave as a goal planning assistant.
    /// It also sets up initial conversation state (e.g., clarification rounds).
    /// </summary>
    /// <param name="conversationId">The unique identifier for the conversation session.</param>
    /// <returns>
    /// A <see cref="ChatHistory"/> object containing the initialized system message.
    /// </returns>
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
    
    /// <summary>
    /// Uses an AI model to evaluate whether the user's goal and clarification history
    /// contains enough clear, specific, and complete information to generate a meaningful,
    /// step-by-step task plan.
    /// </summary>
    /// <param name="originalChatHistory">The current chat history including user input and previous AI responses.</param>
    /// <returns>
    /// <c>true</c> if the AI determines the goal is ready to be broken into tasks; otherwise, <c>false</c>.
    /// </returns>
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
        
        return response == "YES";
    }
    
    /// <summary>
    /// Uses an AI model to generate a single, concise clarifying question that helps the user
    /// provide more detail about their goal, so it can later be translated into a structured task plan.
    /// </summary>
    /// <param name="originalChatHistory">The current chat history containing all previous messages.</param>
    /// <returns>
    /// A friendly, AI-generated clarifying question, or a fallback prompt if the AI response is empty.
    /// </returns>
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
        
        return response ?? "Can you clarify your goal a bit more?";
    }
    
    private async Task<List<string>> GetLabelNamesAsync()
    {
        var labels = await _labelService.GetAllLabelsAsync();
        return labels.Select(label => label.Name).ToList();
    }
}

