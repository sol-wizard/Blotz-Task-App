using System.Collections.Concurrent;
using System.Text;
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

    public override async Task OnConnectedAsync()
    {
        string connectionId = Context.ConnectionId;
        // Add to active connections dictionary
        _activeConnections.TryAdd(connectionId, DateTime.UtcNow.ToString());
        _logger.LogInformation($"User connected: {connectionId} (Active connections: {_activeConnections.Count})");
        await Clients.All.SendAsync("UserConnected", connectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string connectionId = Context.ConnectionId;
        // Remove from active connections
        _activeConnections.TryRemove(connectionId, out _);
        _logger.LogInformation($"User disconnected: {connectionId} (Active connections: {_activeConnections.Count}). Exception: {exception?.Message}");
        await Clients.All.SendAsync("UserDisconnected", connectionId);
        await base.OnDisconnectedAsync(exception);
    }

    private static readonly ConcurrentDictionary<string, List<ChatEntry>> ChatHistoryCache = new();

    public async Task SendMessage(string user, string message, string conversationId)
    {
        if (!ChatHistoryCache.ContainsKey(conversationId))
        {
            ChatHistoryCache[conversationId] = new List<ChatEntry>();
        }
        var timestamp = DateTime.Now;

        // Broadcast user's message
        await Clients.All.SendAsync("ReceiveMessage", user, message, conversationId);

        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage("You are in a conversation, keep your answers brief, always ask follow-up questions, ask if ready for full answer.");

        foreach (var ChatEntry in ChatHistoryCache[conversationId])
        {
            chatHistory.AddUserMessage(ChatEntry.UserMessage);
            chatHistory.AddSystemMessage(ChatEntry.BotResponse);
        }
        chatHistory.AddUserMessage(message);

        // Generate bot response with streaming
        var botResponse = await GenerateStreamingBotResponse(chatHistory, conversationId);

        // Add the message to the in-memory cache
        ChatHistoryCache[conversationId].Add(new ChatEntry
        {
            Timestamp = timestamp,
            User = user,
            UserMessage = message,
            BotResponse = botResponse
        });
    }

    private async Task<string> GenerateStreamingBotResponse(ChatHistory chatHistory, string conversationId)
    {
        var message = new StringBuilder();
        try
        {
            await foreach (var response in _chatCompletionService.GetStreamingChatMessageContentsAsync(chatHistory))
            {
                if (response?.Content != null)
                {
                    message.Append(response.Content);
                }
            }

            // Send the complete message as one response
            var finalMessage = message.ToString();
            await Clients.All.SendAsync("ReceiveMessage", "ChatBot", finalMessage, conversationId);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error in generating bot response: {ex.Message}");
            message.Append("An error occurred while processing your request.");
            await Clients.Caller.SendAsync("ReceiveMessage", "System", "An error occurred while processing your request.");
        }
        return message.ToString();
    }
}