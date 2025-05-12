using System.Collections.Concurrent;
using System.Text.Json;
using BlotzTask.Models;
using BlotzTask.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.SemanticKernel;
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
            var checkResult = await CheckIfReadyForTasks(conversationId, chatHistory, clarificationState);
            if (checkResult.canComplete)
            {
                await Clients.Caller.SendAsync("ReceiveTasks", checkResult.tasks);
                _completedConversations[conversationId] = true;
                await Clients.Caller.SendAsync("ConversationCompleted", conversationId);
                chatHistory.AddAssistantMessage(checkResult.answer);
                await Clients.Caller.SendAsync("ReceiveMessage", "ChatBot",checkResult.answer, conversationId);
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

    private async Task<(bool canComplete, object tasks, string answer)> CheckIfReadyForTasks(
    string conversationId,
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
            return (true, tasks, answer.Content);
        }

        return (false, null, answer.Content);
    }

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
        if (!isClarifying && await NeedsClarification(userMessage))
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

    private async Task<bool> NeedsClarification(string message)
    {
        var clarificationCheck = await _chatCompletionService.GetChatMessageContentAsync(
            new ChatHistory
            {
            new ChatMessageContent(AuthorRole.System,
                SystemMessageTemplate +
                @"Analyze if this needs clarification. Respond ONLY with:
                - ""CLARIFY"" if more info is needed
                - ""PROCEED"" if ready for tasks
                
                User input: " + message)
            });
        return clarificationCheck.Content?.Contains("CLARIFY") == true;
    }

    private async Task FinalizeGoalBreakdown(string conversationId, ChatHistory chatHistory, ClarificationState state)
    {
        var checkResult = await CheckIfReadyForTasks(conversationId, chatHistory, state);
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

    private bool TryParseTasks(string response, out object tasks)
    {
        try
        {
            var jsonStart = response.IndexOf('{');
            var jsonEnd = response.LastIndexOf('}') + 1;
            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var jsonContent = response[jsonStart..jsonEnd];
                tasks = JsonSerializer.Deserialize<object>(jsonContent);
                return true;
            }

            tasks = JsonSerializer.Deserialize<object>(response);
            return true;
        }
        catch
        {
            _logger.LogError("Failed to parse tasks from response: {Response}", response);
            tasks = new { tasks = Array.Empty<ExtractedTask>() };
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