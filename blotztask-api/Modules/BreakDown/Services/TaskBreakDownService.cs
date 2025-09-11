using System.Text.Json;
using System.Xml;
using BlotzTask.Modules.AiTask.DTOs;
using BlotzTask.Modules.BreakDown.prompt;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Shared.Store;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel;


namespace BlotzTask.Modules.BreakDown.Services
{
    public interface ITaskBreakdownService
    {
        Task<List<SubTask>> BreakdownTaskAsync(string taskId, string conversationId, CancellationToken ct);
        Task<List<SubTask>> ModifyBreakdownAsync(string userRequest, string conversationId);
    }

    public class TaskBreakdownService : ITaskBreakdownService
    {
        private readonly ILogger<TaskBreakdownService> _logger;
        
        private readonly GetTaskByIdQueryHandler _getTaskByIdQueryHandler;
        
        private readonly Kernel _kernel;

        private ChatHistoryStore _chatHistoryStore;
        
        private readonly IChatCompletionService _chatCompletionService;
        
        public TaskBreakdownService(ILogger<TaskBreakdownService> logger,
            Kernel kernel, GetTaskByIdQueryHandler getTaskByIdQueryHandler, ChatHistoryStore chatHistoryStore, IChatCompletionService chatCompletionService)
        {
            _logger = logger;
            _kernel = kernel;
            _getTaskByIdQueryHandler = getTaskByIdQueryHandler;
            _chatHistoryStore = chatHistoryStore;
            _chatCompletionService = chatCompletionService;
        }

        // todo: need to change taskDetailsDto to Task id.
        public async Task<List<SubTask>> BreakdownTaskAsync(string taskId, string conversationId, CancellationToken ct)
        {
           
            if (string.IsNullOrWhiteSpace(taskId))
            {
                throw new ArgumentException("Task are invalid.");
            }
            var query = new GetTasksByIdQuery { TaskId = int.Parse(taskId) };
            TaskByIdItemDto task = await _getTaskByIdQueryHandler.Handle(query, ct);

            // Create chat history
            var chatHistory = _chatHistoryStore.GetOrCreate(conversationId);
            chatHistory.AddSystemMessage(TaskBreakDownPrompt.TaskBreakdownSystemMessage);
            chatHistory.AddUserMessage(TaskBreakDownPrompt.TaskBreakdownUserMessage(task));

    
            if (!_kernel.Plugins.Contains("TaskBreakdownPlugin"))
            {
                throw new ArgumentException("TaskBreakdownPlugin not registered in Kernel.");
            }

            var breakdownFunction = _kernel.Plugins["TaskBreakdownPlugin"]["BreakdownTask"];
            var executionSettings = new PromptExecutionSettings
            {
                FunctionChoiceBehavior = FunctionChoiceBehavior.Required(
                    functions: new[] { breakdownFunction },
                    autoInvoke: true
                ),
            };

            try
            {
                // Call LLM to get subtasks
                var chatResults = await _chatCompletionService.GetChatMessageContentsAsync(
                    chatHistory: chatHistory,
                    executionSettings: executionSettings,
                    kernel: _kernel,
                    cancellationToken: ct
                );

                var functionResultMessage = chatResults.LastOrDefault();
                if (functionResultMessage == null || string.IsNullOrEmpty(functionResultMessage.Content))
                {
                    _logger.LogWarning("LLM returned no response for BreakdownTask.");
                    return new List<SubTask>();
                }

                try
                {
                    _logger.LogInformation("LLM raw result: {Content}", functionResultMessage.Content);

                    var rawResult = JsonSerializer.Deserialize<BreakdownTasksWrapper>(
                        functionResultMessage.Content,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                    );

                    if (rawResult == null || rawResult.Subtasks.Count == 0)
                    {
                        _logger.LogWarning("LLM returned empty subtasks.");
                        return new List<SubTask>();
                    }

                    // Store the LLM response in chat history
                    chatHistory.AddAssistantMessage(JsonSerializer.Serialize(rawResult));

                    return rawResult.Subtasks.Select(st => new SubTask
                    {
                        Title = st.Title,
                        Duration = XmlConvert.ToTimeSpan(st.Duration),
                        Order = st.Order,
                    }).ToList();
                }
                catch (JsonException ex)
                {
                    _logger.LogError(ex, "Failed to parse LLM response JSON. Content: {Content}", functionResultMessage.Content);
                    return new List<SubTask>();
                }
            }
            catch (TaskCanceledException)
            {
                _logger.LogWarning("BreakdownTaskAsync was canceled.");
                return new List<SubTask>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during BreakdownTaskAsync.");
                return new List<SubTask>();
            }
        }

        public async Task<List<SubTask>> ModifyBreakdownAsync(string userRequest, string conversationId)
        {
            _logger.LogInformation("ModifyBreakdownAsync called. ConversationId: {ConversationId}, UserRequest: {UserRequest}", conversationId, userRequest);
            // Temporary: Return a hardcoded list of modified subtasks for testing
            var modifiedSubtasks = new List<SubTask>
            {
                new SubTask { Title = "Modified Subtask 1", Duration = TimeSpan.FromHours(1.5) },
                new SubTask { Title = "Modified Subtask 2", Duration = TimeSpan.FromHours(2.5) },
                new SubTask { Title = "Modified Subtask 3", Duration = TimeSpan.FromMinutes(45) }
            };
            return modifiedSubtasks;
        }
    }
}