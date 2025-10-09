using System.Diagnostics;
using System.Text.Json;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Shared.Exceptions;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using OpenTelemetry.Trace;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IAiTaskGenerateService
{
    Task<AiGenerateMessage> GenerateAiResponse(CancellationToken ct);
}

public class AiTaskGenerateService : IAiTaskGenerateService
{
    private static readonly ActivitySource OtelSource = new("ai-service");
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

    public async Task<AiGenerateMessage> GenerateAiResponse(CancellationToken ct)
    {
        var chatHistory = _chatHistoryManagerService.GetChatHistory();

        var lastUserMessageContent = chatHistory
            .Where(message => message.Role == AuthorRole.User)
            .Select(message => message.Content)
            .LastOrDefault();

        _logger.LogInformation("OtelSource.HasListeners={Has}", OtelSource.HasListeners());
        using var activity = OtelSource.StartActivity("ai.chat.completion", ActivityKind.Client);
        if (activity is null) _logger.LogWarning("OTel Activity is null. Check AddSource name & TracerProvider setup.");


        activity?.SetTag("gen_ai.input.content", lastUserMessageContent);
        activity?.AddEvent(new ActivityEvent("gen_ai.input", tags: new ActivityTagsCollection
        {
            { "content", lastUserMessageContent }
        }));

        if (activity != null)
            foreach (var ev in activity.Events)
            {
                Console.WriteLine($"Event: {ev.Name}");
                foreach (var tag in ev.Tags) Console.WriteLine($"   {tag.Key}: {tag.Value}");
            }

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
                throw new AiNoMessageReturnedException();
            }

            var outputContent = functionResultMessage.Content ?? "";
            activity?.SetTag("gen_ai.output.content", outputContent);
            activity?.AddEvent(new ActivityEvent("gen_ai.output", tags: new ActivityTagsCollection
            {
                { "content", outputContent }
            }));

            if (string.IsNullOrWhiteSpace(functionResultMessage.Content))
            {
                _logger.LogWarning("AI response content is empty.");
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
                    _logger.LogWarning("Deserialized object is null.");
                    throw new AiInvalidJsonException(functionResultMessage.Content);
                }

                chatHistory.AddAssistantMessage(JsonSerializer.Serialize(aiGenerateMessage));

                try
                {
                    // 正常执行调用
                    activity?.SetStatus(ActivityStatusCode.Ok);
                }
                catch (Exception ex)
                {
                    activity?.RecordException(ex);
                    activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
                    throw;
                }

                return aiGenerateMessage;
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Failed to deserialize AI response: {Content}", functionResultMessage.Content);
                throw new AiInvalidJsonException(functionResultMessage.Content, ex);
            }
        }
        catch (OperationCanceledException oce)
        {
            _logger.LogInformation(oce, "AI task generation cancelled.");
            throw new AiTaskGenerationException(AiErrorCode.Canceled, "The request was canceled.", oce);
        }
        catch (TokenLimitExceededException ex)
        {
            _logger.LogWarning(ex, "Token limit exceeded during AI task generation.");
            throw new AiTokenLimitedException();
        }
        catch (HttpOperationException ex) when (
            ex.Message.Contains("content_filter", StringComparison.OrdinalIgnoreCase)
        )
        {
            _logger.LogWarning(ex, "Request blocked by Azure OpenAI content filter.");
            throw new AiContentFilterException();
        }
        catch (Exception ex)
        {
            _logger.LogWarning("FULL EXCEPTION DETAILS: {ExceptionMessage}", ex.ToString());
            throw new AiTaskGenerationException(AiErrorCode.Unknown,
                "An unhandled exception occurred during AI task generation.", ex);
        }
    }
}