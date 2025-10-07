using System.Text.Json;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Shared.Exceptions;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;

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

        var extractFn = _kernel.Plugins["TaskExtractionPlugin"]["ExtractTasksFromText"];

        var executionSettings = new PromptExecutionSettings
        {
            FunctionChoiceBehavior = FunctionChoiceBehavior.Required(new[] { extractFn })
        };

        try
        {
            _logger.LogInformation("chat history with user message: {chatHistory}", chatHistory);
            var chatResults = await _chatCompletionService.GetChatMessageContentsAsync(
                chatHistory,
                executionSettings,
                _kernel,
                ct
            );

            var newChatHistory = _chatHistoryManagerService.GetChatHistory();
            _logger.LogInformation("=== ChatHistory AFTER ({Count}) ===", newChatHistory?.Count ?? 0);
            if (newChatHistory != null)
                for (var i = 0; i < newChatHistory.Count; i++)
                {
                    var m = newChatHistory[i];
                    foreach (var item in m.Items)
                        if (item is FunctionCallContent fc)
                            _logger.LogInformation("  -> FunctionCall Name={Name} Args={Args}", fc.FunctionName,
                                fc.Arguments);
                        else if (item is FunctionResultContent fr)
                            _logger.LogInformation("  -> FunctionResult Name={Name} Result={Result}", fr.FunctionName,
                                fr.Result);
                    var source = m.Role == AuthorRole.User ? "USER"
                        : m.Role == AuthorRole.Assistant ? "AI"
                        : m.Role.ToString();
                    _logger.LogInformation("[{Idx}] Source={Source} IsEmpty={Empty} Len={Len}\n{Content}",
                        i, source, string.IsNullOrWhiteSpace(m.Content), m.Content?.Length ?? 0, m.Content ?? "");
                }


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
        catch (TokenLimitExceededException ex)
        {
            _logger.LogWarning(ex, "Token limit exceeded during AI task generation.");

            return new AiGenerateTaskWrapper
            {
                IsSuccess = false,
                ErrorMessage = "You have exceeded token rate limit of your current pricing tier."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unrecoverable error during AI Chat Completion. (Network, API Key, etc.)");
            _logger.LogInformation("FULL EXCEPTION DETAILS: {ExceptionMessage}", ex.ToString());
            return null;
        }
    }
}