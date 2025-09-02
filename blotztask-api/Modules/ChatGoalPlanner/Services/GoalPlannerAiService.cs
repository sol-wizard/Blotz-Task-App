using BlotzTask.Modules.ChatGoalPlanner.Constants;
using BlotzTask.Modules.Labels.Services;
using BlotzTask.Shared.DTOs;
using BlotzTask.Shared.Services;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Modules.ChatGoalPlanner.Services;

public interface IGoalPlannerAiService
{
    Task<List<ExtractedTaskGoalPlanner>?> GenerateAiResponse(ChatHistory chatHistory);
    Task<ChatHistory> InitializeNewConversation(string conversationId);
    Task<bool> IsReadyToGeneratePlanAsync(ChatHistory originalChatHistory);
    Task<List<ExtractedTaskGoalPlanner>?> ReviseGeneratedTasksAsync(List<ExtractedTaskGoalPlanner>? rawTasks, ChatHistory chatHistory);
    Task<string> GenerateClarifyingQuestionAsync(ChatHistory originalChatHistory);
}

public class GoalPlannerAiService : IGoalPlannerAiService
{
    private readonly ILabelService _labelService;
    private readonly IConversationStateService _conversationStateService;
    private readonly TaskParsingService _taskParser;
    private readonly ISafeChatCompletionService _safeChatCompletionService;

    public GoalPlannerAiService(
        ILabelService labelService,
        IConversationStateService conversationStateService,
        TaskParsingService taskParser,
        ISafeChatCompletionService safeChatCompletionService)
    {
        _labelService = labelService;
        _conversationStateService = conversationStateService;
        _taskParser = taskParser;
        _safeChatCompletionService = safeChatCompletionService;
    }
    public async Task<List<ExtractedTaskGoalPlanner>?> GenerateAiResponse(
    ChatHistory chatHistory)
    {
        var tempHistory = new ChatHistory(chatHistory);
        tempHistory.AddSystemMessage($"Based on these details, can you now generate tasks in the required JSON format?");

        var answer = await _safeChatCompletionService.GetSafeContentAsync(tempHistory);

        if (!string.IsNullOrEmpty(answer) && _taskParser.TryParseTasks(answer, out List<ExtractedTaskGoalPlanner>? tasks))
        {
            chatHistory.AddAssistantMessage(answer);
            return tasks;
        }

        return null;
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

        // Add analysis-specific system prompt only to the cloned history
        const string analysisPrompt = @"Analyze if the user's latest input needs clarification considering the full conversation history.

Respond ONLY with:
- ""NO"" if you need more information to create proper tasks
- ""YES"" if you have enough information to generate tasks

Consider:
- Is the goal specific enough?
- Do we have all required parameters?
- Is the timeline clear and specific (today, tomorrow, Friday, by 3pm, January 15th)?
- Are there ambiguous terms that need defining?

Timeline must be specific - reject vague timing like ""soon"", ""urgent"", ""ASAP"".
Be generous with YES when goal is clear and timeline is specific.";

        analysisHistory.AddSystemMessage(analysisPrompt);

        var result = await _safeChatCompletionService.GetSafeContentAsync(analysisHistory);
        var response = result.Trim().ToUpperInvariant();

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
        var clarificationHistory = new ChatHistory(originalChatHistory);
        // Add system prompt that instructs AI to ask one clarifying question
        const string clarifyPrompt = @"
You are a helpful assistant helping users define their goals clearly. Today's date is {0:yyyy-MM-dd}.

Your role is to ask ONE clarifying question per response to help users turn vague or incomplete goals into clear, actionable objectives.

Rules:
- Ask only ONE question per response
- Focus on the most important missing detail that would help make their goal more specific and actionable
- Be friendly, concise, and supportive
- Once their goal is clear enough, help them create step-by-step tasks

Consider:
- Is the goal specific enough?
- Do we have all required parameters?
- Is the timeline clear?
- Are there ambiguous terms that need defining?;

";
        
        clarificationHistory.AddSystemMessage(string.Format(clarifyPrompt,
            DateTime.UtcNow));

        var result = await _safeChatCompletionService.GetSafeContentAsync(clarificationHistory);
        var response = result.Trim();

        return response ?? "Can you clarify your goal a bit more?";
    }
    
    public async Task<List<ExtractedTaskGoalPlanner>?> ReviseGeneratedTasksAsync(List<ExtractedTaskGoalPlanner>? rawTasks, ChatHistory chatHistory)
    {

        string taskListText = string.Join("\n", rawTasks.Select(t => $"- {t.Description}"));

        chatHistory.AddSystemMessage($"""
                                      You previously generated the following tasks based on the user's goal:
                                      {taskListText}

                                      Please review and revise this task list if:
                                      - The tasks are too generic or vague
                                      - Important steps are missing
                                      - Tasks are not actionable or clear

                                      If everything is fine, simply re-list them.
                                      Return the improved tasks in the required JSON format.
                                      """);

        var revisionResult = await _safeChatCompletionService.GetSafeContentAsync(chatHistory);

        if (!string.IsNullOrEmpty(revisionResult) && _taskParser.TryParseTasks(revisionResult, out List<ExtractedTaskGoalPlanner>? revisedTasks))
        {
            return revisedTasks;
        }

        // fallback to original if parse fails
        return rawTasks;
    }

    private async Task<List<string>> GetLabelNamesAsync()
    {
        var labels = await _labelService.GetAllLabelsAsync();
        return [.. labels.Select(label => label.Name)];
    }

}

