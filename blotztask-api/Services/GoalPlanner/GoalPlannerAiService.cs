using BlotzTask.Models;
using BlotzTask.Services.GoalPlanner.Constants;
using BlotzTask.Services.GoalPlanner.Models;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Services.GoalPlanner;

public interface IGoalPlannerAiService
{
    Task<(bool canComplete, List<ExtractedTaskDTO> tasks)> GenerateAiResponse(ChatHistory chatHistory);
    Task<ChatHistory> InitializeNewConversation(string conversationId);
    Task<bool> IsReadyToGeneratePlanAsync(ChatHistory originalChatHistory);
    Task<string> GenerateClarifyingQuestionAsync(ChatHistory originalChatHistory, int currentRound);
}

public class GoalPlannerAiService : IGoalPlannerAiService
{
    private readonly ILabelService _labelService;
    private readonly IChatCompletionService _chatCompletionService;
    private readonly IConversationStateService _conversationStateService;
    private readonly TaskParserService _taskParser;

    private const int MaxClarificationRounds = 3;

    public GoalPlannerAiService(
        ILabelService labelService,
        IChatCompletionService chatCompletionService,
        IConversationStateService conversationStateService,
        TaskParserService taskParser)
    {
        _labelService = labelService;
        _chatCompletionService = chatCompletionService;
        _conversationStateService = conversationStateService;
        _taskParser = taskParser;
        ;
    }
    // public async Task<string> GenerateAiResponse(ChatHistory chatHistory)
    // {
    // var result = await _chatCompletionService.GetChatMessageContentAsync(chatHistory);
    //     Console.WriteLine($"AI result: {result.Content}");
    //     return result.Content;
    // }

    public async Task<(bool canComplete, List<ExtractedTaskDTO> tasks)> GenerateAiResponse(
    ChatHistory chatHistory)
    {
        // string context = $"Original goal: {state.OriginalGoal}\nClarifications:\n" +
        //                  string.Join("\n", state.ClarificationAnswers.Select((a, i) => $"{i + 1}. {a}"));
        var userMessages = $"Original goal and Clarifications:\n" + string.Join("\n", chatHistory
            .Where(message => message.Role == AuthorRole.User)
            .Select(message => message.Content));

        Console.WriteLine("User messages:" + userMessages);

        var tempHistory = new ChatHistory(chatHistory);
        tempHistory.AddAssistantMessage($"Based on these details:\n{userMessages}\n\nCan you now generate tasks in the required JSON format?");

        var answer = await _chatCompletionService.GetChatMessageContentAsync(tempHistory);

        Console.WriteLine("answer content: " + answer.Content);

        if (!string.IsNullOrEmpty(answer?.Content) && _taskParser.TryParseTasks(answer.Content, out var tasks))
        {
            Console.WriteLine("have generated tasks");
            chatHistory.AddAssistantMessage(answer.Content);
            return (true, tasks);
        }

        return (false, null);
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
            DateTime.UtcNow, string.Join(", ", labelNames)));

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
        var analysisHistory = new ChatHistory(originalChatHistory);
        // var analysisHistory = new ChatHistory();

        // // Copy all messages, including system prompts
        // foreach (var message in originalChatHistory)
        // {
        //     analysisHistory.AddMessage(message.Role, message.Content);
        // }

        // Add analysis-specific system prompt only to the cloned history
        const string analysisPrompt =
            @"Analyze if the user's latest input needs clarification considering the full conversation history.
        Respond ONLY with:
        - ""NO"" if you need more information to create proper tasks
        - ""YES"" if you have enough information to generate tasks
        
        Consider:
        - Is the goal specific enough?
        - Do we have all required parameters?
        - Is the timeline clear?
        - Are there ambiguous terms that need defining?";

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
    public async Task<string> GenerateClarifyingQuestionAsync(ChatHistory originalChatHistory, int currentRound)
    {
        // Clone the original chat history
        var clarificationHistory = new ChatHistory(originalChatHistory);
        // var clarificationHistory = new ChatHistory();

        // foreach (var message in originalChatHistory)
        // {
        //     clarificationHistory.AddMessage(message.Role, message.Content);
        // }

        // Add system prompt that instructs AI to ask one clarifying question
        const string clarifyPrompt = @"
You are a helpful assistant helping users define their goals clearly. Today's date is {0:yyyy-MM-dd}.

Your role is to ask ONE clarifying question per response to help users turn vague or incomplete goals into clear, actionable objectives.

Rules:
- Ask only ONE question per response
- Focus on the most important missing detail that would help make their goal more specific and actionable
- Keep track: you can ask a maximum of {1} clarifying questions total before moving to help them break down their goal
- Be friendly, concise, and supportive
- Once their goal is clear enough, help them create step-by-step tasks

Consider:
- Is the goal specific enough?
- Do we have all required parameters?
- Is the timeline clear?
- Are there ambiguous terms that need defining?;

Current question count: {2}/{1}
";

        // Call it like this:
        clarificationHistory.AddSystemMessage(string.Format(clarifyPrompt,
            DateTime.UtcNow,
            MaxClarificationRounds, currentRound
            ));

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

