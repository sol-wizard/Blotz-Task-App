using System.Text.Json;
using BlotzTask.Modules.Chat.Constants;
using BlotzTask.Modules.Chat.Plugins;
using BlotzTask.Modules.Labels.Services;
using BlotzTask.Shared.DTOs;
using BlotzTask.Shared.Services;
using Microsoft.AspNetCore.Connections;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using OpenAI.Chat;

namespace BlotzTask.Modules.Chat.Services;

public interface IAiTaskGenerateService
{
    Task<List<ExtractedTask>?> GenerateAiResponse(ChatHistory chatHistory, CancellationToken ct);
    Task<ChatHistory> InitializeNewConversation(string conversationId);
}

public class AiTaskGenerateService : IAiTaskGenerateService
{
    private readonly IChatHistoryManagerService _chatHistoryManagerService;
    private readonly IChatCompletionService _chatCompletionService; // TODO: use safeChatCompletionService
    private readonly ILogger<AiTaskGenerateService> _logger;
    private readonly Kernel _kernel;

    public AiTaskGenerateService(
        IChatHistoryManagerService chatHistoryManagerService,
        IChatCompletionService chatCompletionService,
        ILogger<AiTaskGenerateService> logger,
        Kernel kernel
    )
    {
        _chatHistoryManagerService = chatHistoryManagerService;
        _chatCompletionService = chatCompletionService;
        _logger = logger;
        _kernel = kernel;
    }

    /// <summary>
    ///    Generates a list of tasks based on the provided chat history.
    /// </summary>
    /// <param name="chatHistory"></param>
    /// <param name="ct"></param>
    /// <returns></returns>
    public async Task<List<ExtractedTask>?> GenerateAiResponse(
        ChatHistory chatHistory,
        CancellationToken ct
    )
    {
        var tempHistory = new ChatHistory(chatHistory);
        tempHistory.AddSystemMessage(
            """
            Reminder:  
            - Only extract tasks from the **latest user message**.  
            - If the user mentions multiple actions in one message, extract **all distinct tasks** separately.  
            - Do not include tasks from earlier turns of the conversation.  
            - Always return every valid task, not just one.
            - The user message may contain Mandarin characters. Please ensure that the extracted tasks are relevant
            to the Mandarin content and provide translations if necessary.
            """
        );

        var extractTasksFunction = _kernel.Plugins["TaskExtractionPlugin"]["ExtractTasks"];
        var executionSettings = new PromptExecutionSettings
        {
            FunctionChoiceBehavior = FunctionChoiceBehavior.Required(
                functions: new[] { extractTasksFunction },
                autoInvoke: true
            ),
        };

        try
        {
            var chatResults = await _chatCompletionService.GetChatMessageContentsAsync(
                chatHistory: tempHistory,
                executionSettings: executionSettings,
                kernel: _kernel,
                cancellationToken: ct
            );

            var functionResultMessage = chatResults.LastOrDefault();

            if (
                functionResultMessage != null
                && !string.IsNullOrEmpty(functionResultMessage.Content)
            )
            {
                try
                {
                    _logger.LogInformation(functionResultMessage.Content);
                    var extractedTasks = JsonSerializer.Deserialize<List<ExtractedTask>>(
                        functionResultMessage.Content,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true } // Important for JSON deserialization
                    );

                    if (extractedTasks != null)
                    {
                        chatHistory.AddAssistantMessage(JsonSerializer.Serialize(extractedTasks));
                        return extractedTasks;
                    }
                    else
                    {
                        return new List<ExtractedTask>();
                    }
                }
                catch (JsonException ex)
                {
                    _logger.LogError(
                        ex,
                        "Failed to deserialize function result content into ExtractedTaskResponse. Content: {Content}",
                        functionResultMessage.Content
                    );
                    return new List<ExtractedTask>();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Semantic Kernel FunctionChoiceBehavior.Required for TaskExtraction failed."
            );
            return new List<ExtractedTask>();
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
        chatHistory.AddSystemMessage(AiTaskGeneratorPrompts.GetSystemMessage(DateTime.Now));

        _chatHistoryManagerService.SetChatHistory(conversationId, chatHistory);

        return Task.FromResult(chatHistory);
    }
}
