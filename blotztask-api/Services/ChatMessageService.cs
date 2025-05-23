using BlotzTask.Models;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using static ConversationStateService;

public class ChatMessageService
{
    private readonly IChatCompletionService _chatCompletionService;
    private readonly ILogger<ChatMessageService> _logger;
    private readonly ConversationStateService _stateService;
    private readonly TaskParserService _taskParser;
    private const int MaxClarificationRounds = 3;

    public ChatMessageService(
    IChatCompletionService chatCompletionService,
    ILogger<ChatMessageService> logger,
    ConversationStateService stateService,
    TaskParserService taskParser)
    {
        _chatCompletionService = chatCompletionService;
        _logger = logger;
        _stateService = stateService;
        _taskParser = taskParser;
    }

    private const string SystemMessageTemplate =
        @"You are a goal clarification and task planning assistant. Today's date is {0:yyyy-MM-dd}.
        Your workflow:
        1. For vague goals, ask MAXIMUM {1} clarifying questions (one at a time)
        2. After answers, either:
        a) Propose tasks in JSON format if goal is actionable, OR
        b) Explain why tasks can't be created
        3. Strictly end after decision in step 2

        Task JSON format requirements:
        {{
            ""tasks"": [
                {{
                    ""title"": ""string"",
                    ""description"": ""string"",
                    ""due_date"": ""YYYY-MM-DD"",
                    ""label"": ""string"",
                    ""isValidTask"": boolean
                }}
            ]
        }}

        Important rules:
        - ALWAYS return valid JSON
        - Include ALL fields for each task
        - due_date must be future dates
        - isValidTask must be true for well-formed tasks
        - Tasks must be in chronological order
        - Each task should logically follow from the previous
        - label: One of the following categories: {2}.
        ";


    public async Task<ChatHistory> InitializeNewConversation(string conversationId, HashSet<string> labelNames)
    {
        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(string.Format(SystemMessageTemplate,
            DateTime.UtcNow, MaxClarificationRounds, string.Join(", ", labelNames)));
        _stateService.AddChatHistory(conversationId, chatHistory);
        return chatHistory;
    }


    public async Task<bool> NeedsClarification(ChatHistory chatHistory, string newMessage)
    {
        // Create a temporary copy of the conversation history
        var tempHistory = new ChatHistory(chatHistory);

        // Add our clarification check prompt
        tempHistory.AddSystemMessage(
            @"Analyze if the user's latest input needs clarification considering the full conversation history.
        Respond ONLY with:
        - ""CLARIFY"" if you need more information to create proper tasks
        - ""PROCEED"" if you have enough information to generate tasks
        
        Consider:
        - Is the goal specific enough?
        - Do we have all required parameters?
        - Is the timeline clear?
        - Are there ambiguous terms that need defining?");

        tempHistory.AddUserMessage(newMessage);

        var clarificationCheck = await _chatCompletionService.GetChatMessageContentAsync(tempHistory);

        // Add some logging for debugging
        _logger.LogDebug($"Clarification check for message: {newMessage}");
        _logger.LogDebug($"Clarification response: {clarificationCheck.Content}");

        return clarificationCheck.Content?.Contains("CLARIFY") == true;
    }

    public async Task<(bool canComplete, List<ExtractedTaskDTO> tasks)> CheckIfReadyForTasks(
    ChatHistory chatHistory,
    ClarificationState state)
    {
        string context = $"Original goal: {state.OriginalGoal}\nClarifications:\n" +
                         string.Join("\n", state.ClarificationAnswers.Select((a, i) => $"{i + 1}. {a}"));

        var tempHistory = new ChatHistory(chatHistory);
        tempHistory.AddUserMessage($"Based on these details:\n{context}\n\nCan you now generate tasks in the required JSON format?");

        var answer = await _chatCompletionService.GetChatMessageContentAsync(tempHistory);

        if (_taskParser.TryParseTasks(answer.Content, out var tasks))
        {
            chatHistory.AddAssistantMessage(answer.Content);
            return (true, tasks);
        }

        return (false, null);
    }
    public async Task<ChatMessageContent> GetChatResponseAsync(ChatHistory chatHistory)
    {
        return await _chatCompletionService.GetChatMessageContentAsync(chatHistory);
    }
}

