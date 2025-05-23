using BlotzTask.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Services
{
    // TODO: Add more error handling using HandleErrorAsync
    // TODO: Sort tasks by due date
    // TODO: This HandleProcessBotResponse and HandleErrorAsync seems to be use in this class only, should we have it private?
    public interface IChatHubService
    {
        Task HandleSendMessage(string user, string message, string conversationId, IHubCallerClients clients);
        Task HandleProcessBotResponse(string conversationId, ChatHistory chatHistory, string botResponse, bool isClarifying, string userMessage, IHubCallerClients clients);
        Task HandleErrorAsync(Exception ex, string conversationId, IHubCallerClients clients);
        Task<(List<LabelDTO> labels, HashSet<string> labelNames)> GetLabelInfoAsync();
    }

    public class ChatHubService : IChatHubService
    {
        private readonly ILogger<ChatHubService> _logger;
        private readonly ILabelService _labelService;
        private readonly ChatMessageService _chatMessageService;
        private readonly ConversationStateService _stateService;
        private readonly TaskParserService _taskParserService;
        private const int MaxClarificationRounds = 3;

        public ChatHubService(
            ILogger<ChatHubService> logger,
            ILabelService labelService,
            ChatMessageService chatMessageService,
            ConversationStateService stateService,
            TaskParserService taskParserService) 
        {
            _logger = logger;
            _labelService = labelService;
            _chatMessageService = chatMessageService;
            _stateService = stateService;
            _taskParserService = taskParserService;
        }

        public async Task HandleSendMessage(string user, string message, string conversationId, IHubCallerClients clients)
        {
            if (_stateService.IsConversationCompleted(conversationId))
            {
                await clients.Caller.SendAsync("ReceiveMessage", "ChatBot",
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
            await clients.Caller.SendAsync("ReceiveMessage", user, message, conversationId);

            bool isClarifying = _stateService.TryGetClarificationState(conversationId, out var clarificationState);
            if (isClarifying)
            {
                _logger.LogInformation($"Clarifying goal for conversation {conversationId}: {message}");
                clarificationState!.ClarificationAnswers.Add(message);
                clarificationState.ClarificationRound++;

                var checkResult = await _chatMessageService.CheckIfReadyForTasks(chatHistory, clarificationState);
                if (checkResult.canComplete)
                {
                    await clients.Caller.SendAsync("ReceiveTasks", checkResult.tasks);
                    _stateService.MarkConversationCompleted(conversationId);
                    await clients.Caller.SendAsync("ConversationCompleted", conversationId);
                    return;
                }

                if (clarificationState.ClarificationRound >= MaxClarificationRounds)
                {
                    await HandleFinalizeGoalBreakdown(conversationId, chatHistory, clarificationState, clients);
                    return;
                }
            }

            try
            {
                var answer = await _chatMessageService.GetChatResponseAsync(chatHistory);
                var botResponse = answer.Content ?? string.Empty;
                await HandleProcessBotResponse(conversationId, chatHistory, botResponse, isClarifying, message, clients);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating bot response");
                await HandleErrorAsync(ex, conversationId, clients);
            }
        }

        public async Task HandleProcessBotResponse(string conversationId, ChatHistory chatHistory, string botResponse, bool isClarifying, string userMessage, IHubCallerClients clients)
        {
            try
            {
                if (_taskParserService.TryParseTasks(botResponse, out var tasks))
                {
                    await clients.Caller.SendAsync("ReceiveTasks", tasks);
                    _stateService.MarkConversationCompleted(conversationId);
                    await clients.Caller.SendAsync("ConversationCompleted", conversationId);
                    return;
                }

                if (!isClarifying && await _chatMessageService.NeedsClarification(chatHistory, userMessage))
                {
                    _stateService.AddClarificationState(conversationId, new ConversationStateService.ClarificationState
                    {
                        OriginalGoal = userMessage,
                        ClarificationRound = 0
                    });
                }

                chatHistory.AddAssistantMessage(botResponse);
                await clients.Caller.SendAsync("ReceiveMessage", "ChatBot", botResponse, conversationId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing bot response");
                await HandleErrorAsync(ex, conversationId, clients);
            }
        }

        private async Task HandleFinalizeGoalBreakdown(string conversationId, ChatHistory chatHistory, ConversationStateService.ClarificationState state, IHubCallerClients clients)
        {
            try
            {
                var checkResult = await _chatMessageService.CheckIfReadyForTasks(chatHistory, state);
                if (checkResult.canComplete)
                {
                    await clients.Caller.SendAsync("ReceiveTasks", checkResult.tasks);
                }
                else
                {
                    string vagueResponse = "We couldn't gather enough information to create actionable tasks. " +
                                         "Please try again with more specific details about your goal.";
                    chatHistory.AddAssistantMessage(vagueResponse);
                    await clients.Caller.SendAsync("ReceiveMessage", "ChatBot", vagueResponse, conversationId);
                }
                _stateService.MarkConversationCompleted(conversationId);
                await clients.Caller.SendAsync("ConversationCompleted", conversationId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in FinalizeGoalBreakdown");
                await HandleErrorAsync(ex, conversationId, clients);
            }
        }

        public async Task HandleErrorAsync(Exception ex, string conversationId, IHubCallerClients clients)
        {
            string errorDetail = $"Error: {ex.Message}";
            if (ex.InnerException != null)
            {
                errorDetail += $"\nInner Exception: {ex.InnerException.Message}";
            }

            _stateService.MarkConversationCompleted(conversationId);

            await clients.Caller.SendAsync("ReceiveMessage", "System",
                $"An error occurred while processing your request.\n\nDEBUG INFO: {errorDetail}");
            await clients.Caller.SendAsync("ConversationCompleted", conversationId);
        }

        public async Task<(List<LabelDTO> labels, HashSet<string> labelNames)> GetLabelInfoAsync()
        {
            var labels = await _labelService.GetAllLabelsAsync();
            var labelNames = labels.Select(label => label.Name).ToHashSet();
            return (labels, labelNames);
        }
    }
}