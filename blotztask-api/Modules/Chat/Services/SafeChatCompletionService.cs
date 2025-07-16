using BlotzTask.Shared.Exceptions;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Modules.Chat.Services;

public interface ISafeChatCompletionService
{
    Task<string> GetSafeContentAsync(ChatHistory history);
}

public class SafeChatCompletionService : ISafeChatCompletionService
{
    private readonly IChatCompletionService _chatCompletionService;

    public SafeChatCompletionService(IChatCompletionService chatCompletionService)
    {
        _chatCompletionService = chatCompletionService;
    }

    public async Task<string> GetSafeContentAsync(ChatHistory history)
    {
        try
        {
            var result = await _chatCompletionService.GetChatMessageContentAsync(history);
            return result?.Content ?? string.Empty;
        }
        catch (Exception ex) when (IsTokenOrRateLimitError(ex))
        {
            throw new TokenLimitExceededException();
        }
    }

    //TODO: This is a potential break if message does not contain the follow.Maybe there is a better way of doing this
    private bool IsTokenOrRateLimitError(Exception ex)
    {
        var msg = ex.Message ?? "";
        return
            msg.Contains("maximum context length", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("token", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("maximum prompt length", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("rate limit", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("HTTP 429", StringComparison.OrdinalIgnoreCase);
    }

}
