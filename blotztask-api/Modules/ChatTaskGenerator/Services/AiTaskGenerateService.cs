using System.Text.Json;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Shared.Exceptions;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IAiTaskGenerateService
{
    Task<AiGenerateMessage> GenerateAiResponse(ChatHistory chatHistory, CancellationToken ct);
}

public class AiTaskGenerateService(
    ILogger<AiTaskGenerateService> logger,
    Kernel kernel)
    : IAiTaskGenerateService
{
    public async Task<AiGenerateMessage> GenerateAiResponse(ChatHistory chatHistory, CancellationToken ct)
    {
        try
        {
            var executionSettings = new OpenAIPromptExecutionSettings
            {
                ResponseFormat = typeof(AiGenerateMessage)
            };

            var result = await kernel.InvokePromptAsync(
                "{{$chatHistory}}",
                new KernelArguments(executionSettings)
                {
                    ["chatHistory"] = chatHistory
                },
                cancellationToken: ct
            );

            var responseContent = result.ToString();

            logger.LogInformation(responseContent);

            if (string.IsNullOrWhiteSpace(responseContent))
            {
                logger.LogWarning("AI response content is empty. ChatHistory count: {Count}", chatHistory.Count);
                throw new AiEmptyResponseException();
            }

            try
            {
                var aiGenerateMessage = JsonSerializer.Deserialize<AiGenerateMessage>(
                    responseContent,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                );

                if (aiGenerateMessage == null)
                {
                    logger.LogWarning("Deserialized object is null.");
                    throw new AiInvalidJsonException(responseContent);
                }

                return aiGenerateMessage;
            }
            catch (JsonException ex)
            {
                logger.LogError(ex, "Failed to deserialize AI response: {Content}", responseContent);
                throw new AiInvalidJsonException(responseContent, ex);
            }
        }
        catch (OperationCanceledException oce)
        {
            logger.LogInformation(oce, "AI task generation cancelled.");
            throw new AiTaskGenerationException(AiErrorCode.Canceled, "The request was canceled.", oce);
        }
        catch (HttpOperationException ex) when (
            ex.Message.Contains("429", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("quota", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("token", StringComparison.OrdinalIgnoreCase)
        )
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