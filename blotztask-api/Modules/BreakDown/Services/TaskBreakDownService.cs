using OpenAI.Chat;
using System.Xml;
using BlotzTask.Modules.AiTask.DTOs;
using System.Text.Json;
using BlotzTask.Modules.Tasks.Queries.Tasks;


namespace BlotzTask.Modules.BreakDown.Services
{
    public interface ITaskBreakdownService
    {
        Task<List<SubTask>> BreakdownTaskAsync(TaskDetailsDto taskDetails, string conversationId);
        Task<List<SubTask>> ModifyBreakdownAsync(string userRequest, string conversationId);
    }

    public class TaskBreakdownService : ITaskBreakdownService
    {
        private readonly ILogger<TaskBreakdownService> _logger;

        private readonly ChatClient _chatClient;
        private readonly GetTaskByIdQueryHandler _getTaskByIdQueryHandler;
        
        public TaskBreakdownService(ILogger<TaskBreakdownService> logger,
            ChatClient chatClient, GetTaskByIdQueryHandler getTaskByIdQueryHandler)
        {
            _logger = logger;
            _chatClient = chatClient;
            _getTaskByIdQueryHandler = getTaskByIdQueryHandler;
        }

        // todo: need to change taskDetailsDto to Task id.
        public async Task<List<SubTask>> BreakdownTaskAsync(TaskDetailsDto taskDetail, string conversationId)
        {
            try
            {
                if (taskDetail == null || string.IsNullOrWhiteSpace(taskDetail.id))
                {
                    throw new ArgumentException("Task details are invalid.");
                }
                var query = new GetTasksByIdQuery { TaskId = int.Parse(taskDetail.id) };
                TaskByIdItemDto task = await _getTaskByIdQueryHandler.Handle(query);
                var messages = new List<ChatMessage>
                    {
                        new SystemChatMessage(@"
                            You are a task breakdown assistant. 
                            Given a task with title, description, start and end time, you need to break it down into smaller subtasks. 
                            Each subtask must include:
                            - title: A short descriptive name
                            - duration: Time in minutes or hours, always converted into TimeSpan (e.g., 30 minutes = PT30M, 2 hours = PT2H).

                            Guidelines:
                            - The total duration of subtasks should not exceed (EndTime - StartTime).
                            - If EndTime is null, estimate reasonable durations for subtasks.
                            - Return a JSON object directly, do not wrap it inside another object or string.
                        "),
                        new UserChatMessage($@"
                            Task Title: {task.Title}
                            Description: {task.Description}
                            Start Time: {(task.StartTime?.ToString("yyyy-MM-dd HH:mm") ?? "null")}
                            End Time: {(task.EndTime?.ToString("yyyy-MM-dd HH:mm") ?? "null")}
                        ")
                    };

                var tool = ChatTool.CreateFunctionTool(
                    functionName: "breakdown_task",
                    functionDescription: "Break down a task into multiple subtasks with duration.",
                    functionParameters: BinaryData.FromObjectAsJson(new
                    {
                        type = "object",
                        properties = new
                        {
                            subtasks = new
                            {
                                type = "array",
                                items = new
                                {
                                    type = "object",
                                    properties = new
                                    {
                                        title = new { type = "string", description = "Subtask title" },
                                        duration = new { type = "string", description = "ISO8601 duration (PT30M, PT2H...)" }
                                    },
                                    required = new[] { "title", "duration" }
                                }
                            }
                        },
                        required = new[] { "subtasks" }
                    })
                );

                var options = new ChatCompletionOptions
                {
                    Tools = { tool }
                };

                ChatCompletion completion = await _chatClient.CompleteChatAsync(messages, options);
                var toolCall = completion.ToolCalls.FirstOrDefault(tc => tc.FunctionName == "breakdown_task");
                if (toolCall == null){
                    _logger.LogWarning("No tool call found in AI response. ConversationId: {ConversationId}", conversationId);
                    return new List<SubTask>();
                }

                var argsJson = toolCall.FunctionArguments.ToString();
                if (string.IsNullOrWhiteSpace(argsJson)){
                    _logger.LogWarning("Tool call arguments are empty. ConversationId: {ConversationId}", conversationId);
                    return new List<SubTask>();
                }

                if (argsJson.StartsWith("{{") && argsJson.EndsWith("}}"))
                {
                    argsJson = argsJson.Substring(1, argsJson.Length - 2);
                }

                var rawResult = JsonSerializer.Deserialize<BreakdownTasksWrapper>(argsJson);

                return rawResult?.Subtasks.Select(st => new SubTask
                {
                    Title = st.Title,
                    Duration = XmlConvert.ToTimeSpan(st.Duration)
                }).ToList() ?? new List<SubTask>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in BreakdownTaskAsync. ConversationId: {ConversationId}", conversationId);
                throw;
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