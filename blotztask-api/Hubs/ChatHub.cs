using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.SemanticKernel.ChatCompletion;
using OpenAI.Chat;

public class ChatHub : Hub
{
    private readonly IChatCompletionService _chatCompletionService;
    private readonly ILogger<ChatHub> _logger;

    // Constants
    private const int MaxInteractions = 10; // Maximum number of interactions before final decision
    private const double MinConfidenceThreshold = 0.5; // Minimum confidence score to consider goal clear enough for planning

    // Define label names
    // TODO: Import label names
    private static readonly List<string> labelNames = new List<string> { "Work", "Personal", "Urgent", "Optional" };

    // Track active connections and conversation states
    private static readonly ConcurrentDictionary<string, string> _activeConnections = new();
    private static readonly ConcurrentDictionary<string, ConversationState> _conversationStates = new();

    // Class to track conversation state for goal planning
    public class ConversationState
    {
        public string Goal { get; set; } = string.Empty;
        public int DurationInDays { get; set; } = 7; // Default duration
        public double ConfidenceScore { get; set; } = 0;
        public int InteractionCount { get; set; } = 0;
        public bool IsReadyForSubmission { get; set; } = false;
        public Dictionary<string, string> AdditionalContext { get; set; } = new Dictionary<string, string>();
    }

    public class ChatEntry
    {
        public DateTime Timestamp { get; set; }
        public required string User { get; set; }
        public required string UserMessage { get; set; }
        public required string BotResponse { get; set; }
    }

    public ChatHub(IChatCompletionService chatCompletionService, ILogger<ChatHub> logger)
    {
        _chatCompletionService = chatCompletionService;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        string connectionId = Context.ConnectionId;
        // Add to active connections dictionary
        _activeConnections.TryAdd(connectionId, DateTime.UtcNow.ToString());
        _logger.LogInformation($"User connected: {connectionId} (Active connections: {_activeConnections.Count})");
        await Clients.Caller.SendAsync("UserConnected", connectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        string connectionId = Context.ConnectionId;
        // Remove from active connections
        _activeConnections.TryRemove(connectionId, out _);
        // Clean up conversation state if exists
        _conversationStates.TryRemove(connectionId, out _);
        _logger.LogInformation($"User disconnected: {connectionId} (Active connections: {_activeConnections.Count}). Exception: {exception?.Message}");
        await Clients.Caller.SendAsync("UserDisconnected", connectionId);
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
        await Clients.Caller.SendAsync("ReceiveMessage", user, message, conversationId);

        // Initialize or get conversation state
        if (!_conversationStates.ContainsKey(conversationId))
        {
            _conversationStates[conversationId] = new ConversationState();
            // First message - assume it's the initial goal
            _conversationStates[conversationId].Goal = message;
        }

        // Process the user message based on conversation state
        var state = _conversationStates[conversationId];
        state.InteractionCount++;

        // Generate bot response
        var botResponse = await ProcessUserMessageWithAI(message, conversationId, state);

        // Add the message to the in-memory cache
        ChatHistoryCache[conversationId].Add(new ChatEntry
        {
            Timestamp = timestamp,
            User = user,
            UserMessage = message,
            BotResponse = botResponse
        });
    }

    public async Task<bool> IsReadyForPlanSubmission(string conversationId)
    {
        if (_conversationStates.TryGetValue(conversationId, out var state))
        {
            return state.IsReadyForSubmission;
        }
        return false;
    }

    public async Task<ConversationState> GetConversationState(string conversationId)
    {
        if (_conversationStates.TryGetValue(conversationId, out var state))
        {
            return state;
        }
        return new ConversationState();
    }

    public async Task ResetConversation(string conversationId)
    {
        _conversationStates.TryRemove(conversationId, out _);
        ChatHistoryCache.TryRemove(conversationId, out _);
        await Clients.Caller.SendAsync("ConversationReset", conversationId);
    }

    private async Task<string> ProcessUserMessageWithAI(string userMessage, string conversationId, ConversationState state)
    {
        // Build conversation context for AI
        var chatHistory = new ChatHistory();

        // System message to define AI behavior
        chatHistory.AddSystemMessage(@"
            You are a helpful goal planning assistant that helps users refine their goals.
            Your objective is to get enough information to create a meaningful task plan.
            Today's date is " + DateTime.Now.ToString("yyyy-MM-dd") + @".
            
            Follow these guidelines:
            1. First, analyze the goal for clarity and specificity
            2. If absolutely necessary, ask 1-2 focused questions about key missing details
            3. Focus only on critical information: timeline, major constraints, or primary outcomes
            4. Be conversational but prioritize moving forward with plan creation
            5. Prefer generating a plan with limited information over asking too many questions
            6. Confirm you're ready to create a plan as soon as you have minimal viable information

            Each task must contain:
            - `title`: A clear and focused title.
            - `description`: A concise explanation of what to do.
            - `due_date`: Estimated completion date in YYYY-MM-DD format, based on logical task flow and available time.
            - `label`: One of the following categories: " + string.Join(", ", labelNames) + @".
            - `isValidTask`: Set to true if this is a concrete and actionable task.

            You will calculate a confidence score internally (not visible to the user):
            - 0.0-0.3: Very vague, need essential information
            - 0.3-" + MinConfidenceThreshold + @": Has basic information, can proceed if necessary
            - " + MinConfidenceThreshold + @"-1.0: Clear enough to create a meaningful plan

            In your response, include a JSON object with the confidence score, hidden inside an HTML comment like this:
            <!-- {""confidenceScore"": 0.5, ""readyToSubmit"": false} -->
        ");

        // Add conversation history
        foreach (var entry in ChatHistoryCache[conversationId])
        {
            chatHistory.AddUserMessage(entry.UserMessage);
            chatHistory.AddSystemMessage(entry.BotResponse);
        }

        // Add current user message
        chatHistory.AddUserMessage(userMessage);

        // Add context about the state of the conversation
        string contextPrompt = $"This is interaction #{state.InteractionCount}. ";

        if (state.InteractionCount == 1)
        {
            // First interaction - focus on understanding the goal
            contextPrompt += "This is the user's initial goal statement. Analyze it and ask for clarifying details.";
        }
        else if (state.InteractionCount <= MaxInteractions)
        {
            // Follow-up interactions - gather only critical missing details
            contextPrompt += $"Previous confidence score was {state.ConfidenceScore}. ";

            if (state.ConfidenceScore < 0.3) // Only ask follow-ups if absolutely necessary
            {
                contextPrompt += "Ask only about the most critical missing details. Focus on one key question.";
            }
            else
            {
                contextPrompt += "The goal has sufficient information. Confirm with the user you're ready to create a plan.";
            }
        }
        else
        {
            // Final interaction - proceed with plan in most cases
            if (state.ConfidenceScore < 0.3) // Only reject if extremely vague
            {
                contextPrompt += "The goal still lacks critical information. Summarize what you know and ask for one specific detail.";
            }
            else
            {
                // Even with medium confidence, we proceed with plan creation
                state.IsReadyForSubmission = true;
                contextPrompt += "Confirm you have sufficient information and are ready to create a plan with what you know.";
            }
        }

        chatHistory.AddSystemMessage(contextPrompt);

        try
        {
            var botResponseBuilder = new StringBuilder();
            double confidenceScore = 0;
            bool readyToSubmit = false;

            // Process the response and extract metadata
            await foreach (var response in _chatCompletionService.GetStreamingChatMessageContentsAsync(chatHistory))
            {
                if (response?.Content != null)
                {
                    botResponseBuilder.Append(response.Content);

                    // Look for JSON metadata in HTML comments
                    var content = botResponseBuilder.ToString();
                    var metadataMatch = System.Text.RegularExpressions.Regex.Match(
                        content,
                        @"<!--\s*({""confidenceScore"":\s*[\d\.]+,\s*""readyToSubmit"":\s*(?:true|false)})\s*-->"
                    );

                    if (metadataMatch.Success)
                    {
                        try
                        {
                            var metadataJson = metadataMatch.Groups[1].Value;
                            var metadata = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(metadataJson);

                            if (metadata.TryGetValue("confidenceScore", out var scoreElement) &&
                                metadata.TryGetValue("readyToSubmit", out var readyElement))
                            {
                                confidenceScore = scoreElement.GetDouble();
                                readyToSubmit = readyElement.GetBoolean();

                                // Update state
                                state.ConfidenceScore = confidenceScore;
                                state.IsReadyForSubmission = readyToSubmit;

                                // Remove the metadata from the user-visible response
                                content = System.Text.RegularExpressions.Regex.Replace(
                                    content,
                                    @"<!--\s*{""confidenceScore"":\s*[\d\.]+,\s*""readyToSubmit"":\s*(?:true|false)}\s*-->",
                                    ""
                                );

                                botResponseBuilder.Clear();
                                botResponseBuilder.Append(content.Trim());
                            }
                        }
                        catch (JsonException ex)
                        {
                            _logger.LogError($"Error parsing metadata JSON: {ex.Message}");
                        }
                    }
                }
            }

            var finalResponse = botResponseBuilder.ToString();

            // If confidence is at least minimal and we've asked enough questions, proceed with plan
            if (state.InteractionCount >= 1 && state.ConfidenceScore >= 0.3)
            {
                state.IsReadyForSubmission = true;
                finalResponse += "\n\nI have enough information to create your plan now. Would you like me to proceed?";
            }
            // Only continue asking if extremely low confidence and first interaction
            else if (state.InteractionCount < MaxInteractions && state.ConfidenceScore < 0.3)
            {
                finalResponse += "\n\nCould you provide that key detail so I can create the best plan for you?";
            }
            // In all other cases, we proceed
            else
            {
                state.IsReadyForSubmission = true;
                finalResponse += "\n\nBased on what you've shared, I'll create a plan for you. Would you like me to proceed?";
            }

            // Send the complete message
            await Clients.Caller.SendAsync("ReceiveMessage", "ChatBot", finalResponse, conversationId);

            // Notify client about state changes
            await Clients.Caller.SendAsync("ConversationStateUpdated", conversationId, new
            {
                confidenceScore = state.ConfidenceScore,
                readyToSubmit = state.IsReadyForSubmission,
                interactionCount = state.InteractionCount
            });

            return finalResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError($"Error in generating bot response: {ex.Message}");
            var errorMessage = "An error occurred while processing your request.";
            await Clients.Caller.SendAsync("ReceiveMessage", "System", errorMessage, conversationId);
            return errorMessage;
        }
    }
}