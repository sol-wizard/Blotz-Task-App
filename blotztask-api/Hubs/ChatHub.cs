using BlotzTask.Models;
using BlotzTask.Services;
using Microsoft.AspNetCore.SignalR;
using Microsoft.SemanticKernel.ChatCompletion;

public class ChatHub : Hub
{
    // TODO: Add more error handling using HandleErrorAsync
    // TODO: Sort tasks by due date
    private readonly IChatCompletionService _chatCompletionService;
    private readonly ILogger<ChatHub> _logger;
    private readonly ILabelService _labelService;
    private readonly ChatMessageService _chatMessageService;
    private readonly ConversationStateService _stateService;
    private readonly TaskParserService _taskParserService;

    public ChatHub(
    IChatCompletionService chatCompletionService,
    ILogger<ChatHub> logger,
    ILabelService labelService,
    ChatMessageService chatMessageService,
    ConversationStateService stateService,
    TaskParserService taskParserService)
    {
        _chatCompletionService = chatCompletionService;
        _logger = logger;
        _labelService = labelService;
        _chatMessageService = chatMessageService;
        _stateService = stateService;
        _taskParserService = taskParserService;
    }

    private const int MaxClarificationRounds = 3;

    // TODO: 🛠️ Winnie, please refactor the logic below into a service class (e.g. `ChatHubService`)
    //
    // ❓ Why:
    // The Hub handles too much logic — makes it harder to read, test, and maintain. It should focus only on real-time messaging.
    //
    // ✅ How:
    // - Create `IChatHubService` + `ChatHubService`
    // - Move logic from `SendMessage`, `ProcessBotResponse`, etc.
    // - Inject the service and delegate logic
    // - Use `HubCallerContext` and `IClientProxy` if needed
    //
    // 📎 Reference:
    // See how other controller is doing 
    // // Track user connections
    public override async Task OnConnectedAsync()
    {
        string connectionId = Context.ConnectionId;
        _logger.LogInformation($"User connected: {connectionId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string connectionId = Context.ConnectionId;
        _stateService.RemoveConversation(connectionId);
        _logger.LogInformation($"User disconnected: {connectionId}. Exception: {exception?.Message}");
        await base.OnDisconnectedAsync(exception);
    }


    public async Task SendMessage(string user, string message, string conversationId)
    {
        // Check if conversation is already completed
        if (_stateService.IsConversationCompleted(conversationId))
        {
            await Clients.Caller.SendAsync("ReceiveMessage", "ChatBot",
                "This conversation has been completed. Please start a new conversation if you have additional goals.",
                conversationId);
            return;
        }

        if (!_stateService.TryGetChatHistory(conversationId, out var chatHistory))
        {
            var (_, labelNames) = await GetLabelInfoAsync();
            chatHistory = await _chatMessageService.InitializeNewConversation(conversationId, labelNames);
        }

        chatHistory.AddUserMessage(message);
        await Clients.Caller.SendAsync("ReceiveMessage", user, message, conversationId);

        bool isClarifying = _stateService.TryGetClarificationState(conversationId, out var clarificationState);
        if (isClarifying)
        {
            _logger.LogInformation($"Clarifying goal for conversation {conversationId}: {message}");
            clarificationState!.ClarificationAnswers.Add(message);
            clarificationState.ClarificationRound++;
            // Check if we can generate tasks now (before checking max rounds)
            var checkResult = await _chatMessageService.CheckIfReadyForTasks(chatHistory, clarificationState);
            if (checkResult.canComplete)
            {
                await Clients.Caller.SendAsync("ReceiveTasks", checkResult.tasks);
                _stateService.MarkConversationCompleted(conversationId);
                await Clients.Caller.SendAsync("ConversationCompleted", conversationId);
                return;
            }

            if (clarificationState.ClarificationRound >= MaxClarificationRounds)
            {
                await FinalizeGoalBreakdown(conversationId, chatHistory, clarificationState);
                // _clarificationStates.TryRemove(conversationId, out _);
                return;
            }
        }

        try
        {
            var answer = await _chatMessageService.GetChatResponseAsync(chatHistory);
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

    // Process the bot's response and handle task generation or clarification
    private async Task ProcessBotResponse(
        string conversationId,
        ChatHistory chatHistory,
        string botResponse,
        bool isClarifying,
        string userMessage)
    {
        try
        {
            // First check if the response contains valid tasks
            if (_taskParserService.TryParseTasks(botResponse, out var tasks))
            {
                await Clients.Caller.SendAsync("ReceiveTasks", tasks);
                _stateService.MarkConversationCompleted(conversationId);
                await Clients.Caller.SendAsync("ConversationCompleted", conversationId);
                return;
            }

            // Handle first-round clarification check
            if (!isClarifying && await _chatMessageService.NeedsClarification(chatHistory, userMessage))
            {
                _stateService.AddClarificationState(conversationId, new ConversationStateService.ClarificationState
                {
                    OriginalGoal = userMessage,
                    ClarificationRound = 0
                });
            }

            chatHistory.AddAssistantMessage(botResponse);
            await Clients.Caller.SendAsync("ReceiveMessage", "ChatBot", botResponse, conversationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing bot response");
            await HandleErrorAsync(ex, conversationId);
        }

    }

    private async Task FinalizeGoalBreakdown(
        string conversationId,
        ChatHistory chatHistory,
        ConversationStateService.ClarificationState state)
    {
        try
        {
            var checkResult = await _chatMessageService.CheckIfReadyForTasks(chatHistory, state);
            if (checkResult.canComplete)
            {
                await Clients.Caller.SendAsync("ReceiveTasks", checkResult.tasks);
            }
            else
            {
                // Fallback to vague response if we still can't generate tasks
                string vagueResponse = "We couldn't gather enough information to create actionable tasks. " +
                                     "Please try again with more specific details about your goal.";
                chatHistory.AddAssistantMessage(vagueResponse);
                await Clients.Caller.SendAsync("ReceiveMessage", "ChatBot", vagueResponse, conversationId);
            }
            _stateService.MarkConversationCompleted(conversationId);
            await Clients.Caller.SendAsync("ConversationCompleted", conversationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in FinalizeGoalBreakdown");
            await HandleErrorAsync(ex, conversationId);
        }
    }

    private async Task HandleErrorAsync(Exception ex, string conversationId)
    {
        string errorDetail = $"Error: {ex.Message}";
        if (ex.InnerException != null)
        {
            errorDetail += $"\nInner Exception: {ex.InnerException.Message}";
        }

        // Mark conversation as completed on error
        _stateService.MarkConversationCompleted(conversationId);

        await Clients.Caller.SendAsync("ReceiveMessage", "System",
            $"An error occurred while processing your request.\n\nDEBUG INFO: {errorDetail}");
        await Clients.Caller.SendAsync("ConversationCompleted", conversationId);
    }

    private async Task<(List<LabelDTO> labels, HashSet<string> labelNames)> GetLabelInfoAsync()
    {
        var labels = await _labelService.GetAllLabelsAsync();
        var labelNames = labels.Select(label => label.Name).ToHashSet();
        return (labels, labelNames);
    }
}