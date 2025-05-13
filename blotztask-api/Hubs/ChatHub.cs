using System.Collections.Concurrent;
using System.Text.Json;
using BlotzTask.Models;
using BlotzTask.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.SemanticKernel.ChatCompletion;

/// <summary>
/// Represents a SignalR hub for managing chat interactions, including goal clarification
/// and task planning. This hub facilitates communication between clients and a chatbot
/// service to assist users in breaking down goals into actionable tasks.
/// </summary>
/// <param name="chatCompletionService">Service for generating chatbot responses.</param>
/// <param name="logger">Logger for logging hub-related events and errors.</param>
/// <param name="labelService">Service for retrieving label information for task categorization.</param>
public class ChatHub(IChatCompletionService chatCompletionService, ILogger<ChatHub> logger, ILabelService labelService) : Hub
{
    private readonly IChatCompletionService _chatCompletionService = chatCompletionService;
    private readonly ILogger<ChatHub> _logger = logger;
    private readonly ILabelService _labelService = labelService;
    private const int MaxClarificationRounds = 3;

    // Define the system message template for the chatbot
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

    // Track conversation states
    private static readonly ConcurrentDictionary<string, ChatHistory> _conversationHistories = new();
    private static readonly ConcurrentDictionary<string, ClarificationState> _clarificationStates = new();
    private static readonly ConcurrentDictionary<string, bool> _completedConversations = new();

    private class ClarificationState
    {
        public int ClarificationRound { get; set; }
        public string OriginalGoal { get; set; } = string.Empty;
        public List<string> ClarificationAnswers { get; } = [];
    }

    // Track user connections
    public override async Task OnConnectedAsync()
    {
        string connectionId = Context.ConnectionId;
        _logger.LogInformation($"User connected: {connectionId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string connectionId = Context.ConnectionId;
        _conversationHistories.TryRemove(connectionId, out _);
        _clarificationStates.TryRemove(connectionId, out _);
        _completedConversations.TryRemove(connectionId, out _);
        _logger.LogInformation($"User disconnected: {connectionId}. Exception: {exception?.Message}");
        await base.OnDisconnectedAsync(exception);
    }


    public async Task SendMessage(string user, string message, string conversationId)
    {
        // Check if conversation is already completed
        if (_completedConversations.TryGetValue(conversationId, out var isCompleted) && isCompleted)
        {
            await Clients.Caller.SendAsync("ReceiveMessage", "ChatBot", "This conversation has been completed. Please start a new conversation if you have additional goals.", conversationId);
            return;
        }

        var (_, labelNames) = await GetLabelInfoAsync();

        // Initialize conversation history if not already present
        if (!_conversationHistories.TryGetValue(conversationId, out var chatHistory))
        {
            chatHistory = await HandleNewConversation(conversationId, labelNames);
        }

        chatHistory.AddUserMessage(message);
        await Clients.Caller.SendAsync("ReceiveMessage", user, message, conversationId);


        bool isClarifying = _clarificationStates.TryGetValue(conversationId, out var clarificationState);
        if (isClarifying)
        {
            _logger.LogInformation($"Clarifying goal for conversation {conversationId}: {message}");
            clarificationState!.ClarificationAnswers.Add(message);
            clarificationState.ClarificationRound++;
            // Check if we can generate tasks now (before checking max rounds)
            var checkResult = await CheckIfReadyForTasks(chatHistory, clarificationState);
            if (checkResult.canComplete)
            {
                await Clients.Caller.SendAsync("ReceiveTasks", checkResult.tasks);
                _completedConversations[conversationId] = true;
                await Clients.Caller.SendAsync("ConversationCompleted", conversationId);
                return;
            }

            if (clarificationState.ClarificationRound >= MaxClarificationRounds)
            {
                await FinalizeGoalBreakdown(conversationId, chatHistory, clarificationState);
                _clarificationStates.TryRemove(conversationId, out _);
                return;
            }
        }

        try
        {
            var answer = await _chatCompletionService.GetChatMessageContentAsync(chatHistory);
            var botResponse = answer.Content ?? string.Empty;
            await ProcessBotResponse(conversationId, chatHistory, botResponse, isClarifying, message);

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating bot response");
            string errorDetail = $"Error: {ex.Message}";
            if (ex.InnerException != null)
            {
                errorDetail += $"\nInner Exception: {ex.InnerException.Message}";
            }
            await Clients.Caller.SendAsync("ReceiveMessage", "System",
                $"An error occurred while processing your request.\n\nDEBUG INFO: {errorDetail}");
        }
    }

    // Check if we can generate tasks based on the current state
    private async Task<(bool canComplete, object tasks)> CheckIfReadyForTasks(
    ChatHistory chatHistory,
    ClarificationState state)
    {
        string context = $"Original goal: {state.OriginalGoal}\nClarifications:\n" +
                         string.Join("\n", state.ClarificationAnswers.Select((a, i) => $"{i + 1}. {a}"));

        var tempHistory = new ChatHistory(chatHistory);
        tempHistory.AddUserMessage($"Based on these details:\n{context}\n\nCan you now generate tasks in the required JSON format?");

        var answer = await _chatCompletionService.GetChatMessageContentAsync(tempHistory);

        if (TryParseTasks(answer.Content, out var tasks))
        {
            chatHistory.AddAssistantMessage(answer.Content);
            return (true, tasks);
        }

        return (false, null);
    }

    // Process the bot's response and handle task generation or clarification
    private async Task ProcessBotResponse(
        string conversationId,
        ChatHistory chatHistory,
        string botResponse,
        bool isClarifying,
        string userMessage)
    {
        // First check if the response contains valid tasks
        if (TryParseTasks(botResponse, out var tasks))
        {
            await Clients.Caller.SendAsync("ReceiveTasks", tasks);
            _completedConversations[conversationId] = true;
            await Clients.Caller.SendAsync("ConversationCompleted", conversationId);
            return;
        }

        // Handle first-round clarification check
        if (!isClarifying && await NeedsClarification(chatHistory, userMessage))
        {
            _clarificationStates[conversationId] = new ClarificationState
            {
                OriginalGoal = userMessage,
                ClarificationRound = 0
            };
        }

        chatHistory.AddAssistantMessage(botResponse);
        await Clients.Caller.SendAsync("ReceiveMessage", "ChatBot", botResponse, conversationId);
    }

    private async Task<ChatHistory> HandleNewConversation(string conversationId, HashSet<string> labelNames)
    {
        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(string.Format(SystemMessageTemplate,
            DateTime.UtcNow, MaxClarificationRounds, string.Join(", ", labelNames)));
        _conversationHistories[conversationId] = chatHistory;
        return chatHistory;
    }

    private async Task<bool> NeedsClarification(ChatHistory chatHistory, string newMessage)
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
    private async Task FinalizeGoalBreakdown(string conversationId, ChatHistory chatHistory, ClarificationState state)
    {
        var checkResult = await CheckIfReadyForTasks(chatHistory, state);
        if (checkResult.canComplete)
        {
            await Clients.Caller.SendAsync("ReceiveTasks", checkResult.tasks);
            _completedConversations[conversationId] = true;
            await Clients.Caller.SendAsync("ConversationCompleted", conversationId);
            return;
        }

        // Fallback to vague response if we still can't generate tasks
        string vagueResponse = "We couldn't gather enough information to create actionable tasks. " +
                             "Please try again with more specific details about your goal.";

        chatHistory.AddAssistantMessage(vagueResponse);
        await Clients.Caller.SendAsync("ReceiveMessage", "ChatBot", vagueResponse, conversationId);
        _completedConversations[conversationId] = true;
        await Clients.Caller.SendAsync("ConversationCompleted", conversationId);
    }

    // Try to parse the tasks from the response
    private bool TryParseTasks(string response, out object tasks)
    {
        tasks = new { tasks = Array.Empty<ExtractedTask>() };

        if (string.IsNullOrWhiteSpace(response))
        {
            _logger.LogWarning("Empty response received for task parsing");
            return false;
        }

        try
        {
            var jsonStart = response.IndexOf('{');
            var jsonEnd = response.LastIndexOf('}') + 1;

            string jsonContent = null;

            if (jsonStart >= 0 && jsonEnd > jsonStart && jsonEnd <= response.Length)
            {
                jsonContent = response[jsonStart..jsonEnd];
                _logger.LogDebug("Extracted JSON content: {JsonContent}", jsonContent);
            }
            else
            {
                jsonContent = response;
            }

            // Deserialize with validation
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                AllowTrailingCommas = true,
                ReadCommentHandling = JsonCommentHandling.Skip
            };

            var parsed = JsonSerializer.Deserialize<JsonElement>(jsonContent, options);

            // Validate the JSON structure
            if (!parsed.TryGetProperty("tasks", out var tasksArray) ||
                tasksArray.ValueKind != JsonValueKind.Array)
            {
                _logger.LogWarning("Response doesn't contain valid tasks array");
                return false;
            }

            // Validate each task
            foreach (var taskElement in tasksArray.EnumerateArray())
            {
                if (taskElement.ValueKind != JsonValueKind.Object)
                {
                    _logger.LogWarning("Invalid task element found");
                    return false;
                }
            }

            // If we got here, the JSON is valid
            tasks = JsonSerializer.Deserialize<object>(jsonContent, options);
            return true;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "JSON parsing failed for response: {Response}", response);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error parsing tasks");
            return false;
        }
    }

    private async Task<(List<LabelDTO> labels, HashSet<string> labelNames)> GetLabelInfoAsync()
    {
        var labels = await _labelService.GetAllLabelsAsync();
        var labelNames = labels.Select(label => label.Name).ToHashSet();
        return (labels, labelNames);
    }
}