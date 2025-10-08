using System.Text.Json;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Shared.Exceptions;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IAiTaskGenerateService
{
    Task<AiGenerateTaskWrapper> GenerateAiResponse(CancellationToken ct);
}

public class AiTaskGenerateService : IAiTaskGenerateService
{
    private readonly IChatCompletionService _chatCompletionService;
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

    public async Task<AiGenerateTaskWrapper> GenerateAiResponse(CancellationToken ct)
    {
        var chatHistory = _chatHistoryManagerService.GetChatHistory();

        var executionSettings = new OpenAIPromptExecutionSettings
        {
            Temperature = 0.2f
        };

        try
        {
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
                return Error("AI returned no messages.");
            }

            if (string.IsNullOrWhiteSpace(functionResultMessage.Content))
            {
                _logger.LogWarning("AI response content is empty.");
                return Error("AI returned empty content.");
            }

            try
            {
                var aiGenerateTaskWrapper = JsonSerializer.Deserialize<AiGenerateTaskWrapper>(
                    functionResultMessage.Content,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );

                if (aiGenerateTaskWrapper == null)
                {
                    _logger.LogWarning("Deserialized object is null.");
                    return Error("AI deserialization failed.");
                }

                chatHistory.AddAssistantMessage(JsonSerializer.Serialize(aiGenerateTaskWrapper));
                return aiGenerateTaskWrapper;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to deserialize AI response: {Content}", functionResultMessage.Content);
                return Error("AI returned invalid JSON format.");
            }
        }
        catch (TokenLimitExceededException ex)
        {
            _logger.LogWarning(ex, "Token limit exceeded during AI task generation.");
            return Error("You have exceeded token rate limit of your current pricing tier.");
        }
        catch (HttpOperationException ex) when (
            ex.Message.Contains("content_filter", StringComparison.OrdinalIgnoreCase)
        )
        {
            _logger.LogWarning(ex, "Request blocked by Azure OpenAI content filter.");
            return Error("Your message triggered safety filters. Please rephrase and try again.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning("FULL EXCEPTION DETAILS: {ExceptionMessage}", ex.ToString());
            return Error("An unhandled exception occurred during AI task generation.");
        }
    }
    
    private AiGenerateTaskWrapper Error(string message) =>
        new()
        {
            IsSuccess = false,
            ErrorMessage = message
        };
}
