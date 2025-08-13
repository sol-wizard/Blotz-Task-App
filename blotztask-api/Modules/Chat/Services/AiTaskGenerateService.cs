using BlotzTask.Modules.Chat.Constants;
using BlotzTask.Modules.Labels.Services;
using BlotzTask.Shared.DTOs;
using BlotzTask.Shared.Services;
using Microsoft.SemanticKernel.ChatCompletion;
using OpenAI.Chat;

namespace BlotzTask.Modules.Chat.Services;

public interface IAiTaskGenerateService
{
    Task<List<ExtractedTaskDto>?> GenerateAiResponse(ChatHistory chatHistory);
    Task<ChatHistory> InitializeNewConversation(string conversationId);
    Task<List<ExtractedTaskDto>?> ReviseGeneratedTasksAsync(
        List<ExtractedTaskDto>? rawTasks,
        ChatHistory chatHistory
    );
}

public class AiTaskGenerateService : IAiTaskGenerateService
{
    private readonly IConversationStateService _conversationStateService;
    private readonly TaskParsingService _taskParser;
    private readonly ISafeChatCompletionService _safeChatCompletionService;
    private readonly ILogger<AiTaskGenerateService> _logger;

    public AiTaskGenerateService(
        IConversationStateService conversationStateService,
        TaskParsingService taskParser,
        ISafeChatCompletionService safeChatCompletionService,
        ILogger<AiTaskGenerateService> logger
    )
    {
        _conversationStateService = conversationStateService;
        _taskParser = taskParser;
        _safeChatCompletionService = safeChatCompletionService;
        _logger = logger;
    }

    /// <summary>
    ///    Generates a list of tasks based on the provided chat history.
    /// </summary>
    /// <param name="chatHistory"></param>
    /// <returns></returns>
    public async Task<List<ExtractedTaskDto>?> GenerateAiResponse(ChatHistory chatHistory)
    {
        var tempHistory = new ChatHistory(chatHistory);
        tempHistory.AddSystemMessage(
            $"Based on these details, can you generate tasks in the required JSON format?"
        );

        var answer = await _safeChatCompletionService.GetSafeContentAsync(tempHistory);

        if (!string.IsNullOrEmpty(answer))
        {
            if (_taskParser.TryParseTasks(answer, out List<ExtractedTaskDto>? tasks))
            {
                chatHistory.AddAssistantMessage(answer);
                return tasks;
            }
            else
            {
                _logger.LogWarning("Failed to parse tasks from AI response: {Answer}", answer);
            }
        }
        return null;
    }

    /// <summary>
    ///  Initializes a new conversation by creating a new ChatHistory object
    ///  and setting the system message.
    ///  </summary>
    /// <param name="conversationId">The unique identifier for the conversation.</param>
    /// <returns>A Task that represents the asynchronous operation, containing the initialized ChatHistory.</returns
    /// <exception cref="ArgumentException">Thrown when the conversationId is null or empty.</exception>
    /// <exception cref="InvalidOperationException">Thrown when the conversation state service fails to set
    /// the chat history.</exception>
    public Task<ChatHistory> InitializeNewConversation(string conversationId)
    {
        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(
            string.Format(AiTaskGeneratorPrompts.SystemMessageTemplate, DateTime.Now)
        );

        _conversationStateService.SetChatHistory(conversationId, chatHistory);

        return Task.FromResult(chatHistory);
    }

    /// <summary>
    ///   Revises the generated tasks based on the chat history.
    ///  It checks if the tasks are too generic, missing important steps, or not actionable
    /// </summary>
    /// <param name="rawTasks"></param>
    /// <param name="chatHistory"></param>
    /// <returns></returns>
    public async Task<List<ExtractedTaskDto>?> ReviseGeneratedTasksAsync(
        List<ExtractedTaskDto>? rawTasks,
        ChatHistory chatHistory
    )
    {
        if (rawTasks != null)
        {
            string taskListText = string.Join("\n", rawTasks.Select(t => $"- {t.Description}"));

            chatHistory.AddSystemMessage(
                $"""
                You previously generated the following tasks based on the user's input:
                {taskListText}

                Please review and revise this task list if:
                - The tasks are too generic or vague
                - Important steps are missing
                - Tasks are not actionable or clear

                If everything is fine, simply re-list them.
                Return the improved tasks in the required JSON format.
                """
            );
        }

        var revisionResult = await _safeChatCompletionService.GetSafeContentAsync(chatHistory);

        _logger.LogInformation("Revision result: {RevisionResult}", revisionResult);

        if (
            !string.IsNullOrEmpty(revisionResult)
            && _taskParser.TryParseTasks(revisionResult, out List<ExtractedTaskDto>? revisedTasks)
        )
        {
            return revisedTasks;
        }

        // fallback to original if parse fails
        return rawTasks;
    }

    private ChatTool CreateExtractedTasksTool(HashSet<string> labelNames)
    {
        return ChatTool.CreateFunctionTool(
            functionName: "extract_tasks",
            functionDescription: "Extracts tasks from the provided input and returns an array of task objects.",
            functionParameters: BinaryData.FromObjectAsJson(
                new
                {
                    type = "array",
                    items = new
                    {
                        type = "object",
                        properties = new
                        {
                            title = new
                            {
                                type = "string",
                                description = "Title of the task extracted from the user's input.",
                            },
                            description = new
                            {
                                type = "string",
                                description = "Description of the task extracted or generated based on the user's input.",
                            },
                            end_time = new
                            {
                                type = "string",
                                format = "date",
                                description = "End time of the task in YYYY-MM-DD format.",
                            },
                        },
                        required = new[] { "title", "description", "end_time" },
                    },
                }
            )
        );
    }
}
