using System.Text.Json; using BlotzTask.Modules.ChatTaskGenerator.Constants;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Shared.Exceptions;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IAiTaskGenerateService
{
    Task<AiGenerateMessage> GenerateAiResponse(CancellationToken ct);
}

public class AiTaskGenerateService(
    IChatHistoryManagerService chatHistoryManagerService,
    IChatCompletionService chatCompletionService,
    ILogger<AiTaskGenerateService> logger,
    Kernel kernel)
    : IAiTaskGenerateService
{
    public async Task<AiGenerateMessage> GenerateAiResponse(CancellationToken ct)
    {
        var chatHistory = chatHistoryManagerService.GetChatHistory();

        try
        {
            var executionSettings = new OpenAIPromptExecutionSettings
            {
                Temperature = 0.2, // Low temperature for more deterministic, consistent breakdowns
                ResponseFormat = typeof(AiGenerateMessage) // Enforces structured output via JSON Schema
            };
            
            var chatResults = await chatCompletionService.GetChatMessageContentsAsync(
                chatHistory,
                executionSettings,
                kernel,
                ct
            );

            var functionResultMessage = chatResults.LastOrDefault();

            if (functionResultMessage == null)
            {
                logger.LogWarning(
                    "Chat completion returned no messages. ChatHistory count: {Count}, Model: {ModelId}",
                    chatHistory.Count,
                    executionSettings.ModelId ?? "unknown"
                );
                throw new AiNoMessageReturnedException();
            }

            if (string.IsNullOrWhiteSpace(functionResultMessage.Content))
            {
                logger.LogWarning("AI response content is empty.");
                throw new AiEmptyResponseException();
            }

            try
            {
                var aiGenerateMessage = JsonSerializer.Deserialize<AiGenerateMessage>(
                    functionResultMessage.Content,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );

                if (aiGenerateMessage == null)
                {
                    logger.LogWarning("Deserialized object is null.");
                    throw new AiInvalidJsonException(functionResultMessage.Content);
                }

                chatHistory.AddAssistantMessage(JsonSerializer.Serialize(aiGenerateMessage));
                return aiGenerateMessage;
            }
            catch (JsonException ex)
            {
                logger.LogError(ex, "Failed to deserialize AI response: {Content}", functionResultMessage.Content);
                throw new AiInvalidJsonException(functionResultMessage.Content, ex);
            }
        }
        catch (OperationCanceledException oce)
        {
            logger.LogInformation(oce, "AI task generation cancelled.");
            throw new AiTaskGenerationException(AiErrorCode.Canceled, "The request was canceled.", oce);
        }
        catch (TokenLimitExceededException ex)
        {
            logger.LogWarning(ex, "Token limit exceeded during AI task generation.");
            throw new AiTokenLimitedException();
        }
        catch (HttpOperationException ex) when (
            ex.Message.Contains("content_filter", StringComparison.OrdinalIgnoreCase)
        )
        {
            logger.LogWarning(ex, "Request blocked by Azure OpenAI content filter.");
            throw new AiContentFilterException();
        }
        catch (Exception ex)
        {
            logger.LogWarning("FULL EXCEPTION DETAILS: {ExceptionMessage}", ex.ToString());
            throw new AiTaskGenerationException(AiErrorCode.Unknown,
                "An unhandled exception occurred during AI task generation.", ex);
        }
    }
}