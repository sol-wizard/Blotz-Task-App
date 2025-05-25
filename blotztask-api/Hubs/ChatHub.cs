using BlotzTask.Models.GoalToTask;
using BlotzTask.Services.GoalPlanner;
using Microsoft.AspNetCore.SignalR;

public class ChatHub : Hub
{
    private readonly ILogger<ChatHub> _logger;
    // private readonly IChatHubService _chatHubService;
    private readonly IConversationStateService _conversationStateService;
    private readonly IGoalPlannerChatService _goalPlannerChatService;

    public ChatHub(
    ILogger<ChatHub> logger,
    IGoalPlannerChatService goalPlannerChatService,
    IConversationStateService conversationStateService)
    {
        _logger = logger;
        // _chatHubService = chatHubService;
        _conversationStateService = conversationStateService;
        _goalPlannerChatService = goalPlannerChatService;
    }
    public override async Task OnConnectedAsync()
    {
        string connectionId = Context.ConnectionId;
        _logger.LogInformation($"User connected: {connectionId}");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string connectionId = Context.ConnectionId;
        _logger.LogInformation($"User disconnected: {connectionId}. Exception: {exception?.Message}");
        await base.OnDisconnectedAsync(exception);
    }


    //TODO: Add comments about Functionality and param explain...
    public async Task SendMessage(string user, string message, string conversationId)
    {
        // Check if this is the user's first message in the conversation.
        // If no chat history exists, initialize a new conversation with a system prompt.
        if (!_conversationStateService.TryGetChatHistory(conversationId, out var chatHistory))
        {
            chatHistory = await _goalPlannerChatService.InitializeNewConversation(conversationId);
        }
        
        // 1. Echo user's message back
        var userMsg = new ConversationMessage
        {
            Sender = user,
            Content = message,
            ConversationId = conversationId,
            Timestamp = DateTime.UtcNow,
            IsBot = false
        };
        chatHistory.AddUserMessage(userMsg.Content);
        await Clients.Caller.SendAsync("ReceiveMessage", userMsg);
        
        // Get clarification state and evaluate plan readiness
        var clarificationState = _conversationStateService.GetClarificationState(conversationId);
        var isReadyToGeneratePlan = await _goalPlannerChatService.IsReadyToGeneratePlanAsync(chatHistory);

        string botContent;

        // Case 1: Not ready and clarification round limit exceeded
        //TODO: Change this 3 into a constant
        if (!isReadyToGeneratePlan && clarificationState.ClarificationRound >= 3)
        {
            botContent = "Sorry, I couldn't generate a helpful task plan based on the information provided. You can try restating your goal with more details.";
            clarificationState.ClarificationRound = 0;

            await Clients.Caller.SendAsync("ConversationCompleted", conversationId);
        }
        // Case 2: Not ready, still under max clarification attempts
        else if (!isReadyToGeneratePlan)
        {
            botContent = await _goalPlannerChatService.GenerateClarifyingQuestionAsync(chatHistory);
            clarificationState.ClarificationRound++;
        }
        // Case 3: Ready to generate plan
        else
        {
            botContent = await _goalPlannerChatService.GenerateAiResponse(chatHistory);
            clarificationState.ClarificationRound = 0;
            
            await Clients.Caller.SendAsync("ConversationCompleted", conversationId);
        }
        
        // Save updated clarification state
        _conversationStateService.SetClarificationState(conversationId, clarificationState);
        // Create and send the bot's message
        var botMsg = new ConversationMessage
        {
            Sender = "ChatBot",
            Content = botContent,
            ConversationId = conversationId,
            Timestamp = DateTime.UtcNow,
            IsBot = true
        };

        await Clients.Caller.SendAsync("ReceiveMessage", botMsg);
        // await _chatHubService.HandleSendMessage(user, message, conversationId, Clients);
    }
}