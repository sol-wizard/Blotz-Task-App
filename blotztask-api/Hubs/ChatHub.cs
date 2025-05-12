using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Microsoft.SemanticKernel.ChatCompletion;

public class ChatHub(IChatCompletionService chatCompletionService, ILogger<ChatHub> logger) : Hub
{
    private readonly IChatCompletionService _chatCompletionService = chatCompletionService;
    private readonly ILogger<ChatHub> _logger = logger;
    // Track active connections
    private static readonly ConcurrentDictionary<string, string> _activeConnections = new();

    public class ChatEntry
    {
        public DateTime Timestamp { get; set; }
        public required string User { get; set; }
        public required string UserMessage { get; set; }
        public required string BotResponse { get; set; }
    }

   // Track active connections and their chat histories
    private static readonly ConcurrentDictionary<string, ChatHistory> _conversationHistories = new();

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
        _logger.LogInformation($"User disconnected: {connectionId}. Exception: {exception?.Message}");
        await base.OnDisconnectedAsync(exception);
    }
    
    public async Task SendMessage(string user, string message, string conversationId)
    {
        if (!_conversationHistories.TryGetValue(conversationId, out var chatHistory))
        {
            chatHistory = [];
            chatHistory.AddSystemMessage($@"
                You are a task planning assistant. Today's date is {DateTime.UtcNow:yyyy-MM-dd}.
                Your job is to break down a user's goal into multiple **meaningful and necessary** tasks.
                ");
            _conversationHistories[conversationId] = chatHistory;
        }

        chatHistory.AddUserMessage(message);
        await Clients.Caller.SendAsync("ReceiveMessage", user, message, conversationId);
        try
        {
            var answer = await _chatCompletionService.GetChatMessageContentAsync(chatHistory);
            var botResponse = answer.Content ?? "I didn't get a response.";
            
            chatHistory.AddAssistantMessage(botResponse);
            await Clients.Caller.SendAsync("ReceiveMessage", "ChatBot", botResponse, conversationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating bot response");
            await Clients.Caller.SendAsync("ReceiveMessage", "System", 
                "An error occurred while processing your request.");
        }
    }
}

