using System.Text.Json;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IAiTaskGenerateService
{
    Task<AiGenerateTaskWrapper?> GenerateAiResponse(CancellationToken ct);
}

public class AiTaskGenerateService : IAiTaskGenerateService
{
    private readonly IChatCompletionService _chatCompletionService; // TODO: use safeChatCompletionService
    private readonly IChatHistoryManagerService _chatHistoryManagerService;
    private readonly Kernel _kernel;
    private readonly ILogger<AiTaskGenerateService> _logger;

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

   
    public async Task<AiGenerateTaskWrapper?> GenerateAiResponse(
        CancellationToken ct
    )
    {
        var chatHistory = _chatHistoryManagerService.GetChatHistory();

        var extractTasksFunction = _kernel.Plugins["TaskExtractionPlugin"]["ExtractTasks"];
        var executionSettings = new OpenAIPromptExecutionSettings
        {
            Temperature = 0.4f,
            FunctionChoiceBehavior = FunctionChoiceBehavior.Required(
                new[] { extractTasksFunction }
            )
        };


        var chatResults = await _chatCompletionService.GetChatMessageContentsAsync(
            chatHistory,
            executionSettings,
            _kernel,
            ct
        );

        var functionResultMessage = chatResults.LastOrDefault();

        if (functionResultMessage == null)
        {
            _logger.LogWarning(
                "Chat completion returned no messages. ChatHistory count: {Count}, Model: {ModelId}",
                chatHistory.Count,
                executionSettings.ModelId ?? "unknown"
            );
            return null;
        }


        try
        {
            var aiGenerateTaskWrapper = JsonSerializer.Deserialize<AiGenerateTaskWrapper>(
                functionResultMessage.Content,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

            if (aiGenerateTaskWrapper != null)
            {
                chatHistory.AddAssistantMessage(JsonSerializer.Serialize(aiGenerateTaskWrapper));
                return aiGenerateTaskWrapper;
            }

            return null;
        }
        catch (JsonException ex)
        {
            _logger.LogError(
                ex,
                "Failed to deserialize function result content into ExtractedTaskResponse. Content: {Content}",
                functionResultMessage.Content
            );

            return null;
        }
    }
}