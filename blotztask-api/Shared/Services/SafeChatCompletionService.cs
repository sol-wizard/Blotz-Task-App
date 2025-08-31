using BlotzTask.Shared.Exceptions;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Shared.Services;

// This service wraps the IChatCompletionService to handle exceptions and provide a safe way to get chat content.
public interface ISafeChatCompletionService
{
    Task<string> GetSafeContentAsync(ChatHistory history);
}

// TODO: Add GetChatMessageContentsAsync signature to the interface if needed
public class SafeChatCompletionService : ISafeChatCompletionService
{
    private readonly IChatCompletionService _chatCompletionService;

    public SafeChatCompletionService(IChatCompletionService chatCompletionService)
    {
        _chatCompletionService = chatCompletionService;
    }

    /// <summary>
    /// Gets the content of the chat history safely, handling token limit and rate limit exceptions.
    /// </summary>
    ///  <param name="history">The chat history to retrieve content from.</param>
    /// <returns>The content of the chat history, or an empty string if an error occurs
    /// due to token limits or rate limits.</returns>
    /// <exception cref="TokenLimitExceededException">Thrown when the token limit is exceeded.</exception>
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
        return msg.Contains("maximum context length", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("token", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("maximum prompt length", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("rate limit", StringComparison.OrdinalIgnoreCase)
            || msg.Contains("HTTP 429", StringComparison.OrdinalIgnoreCase);
    }
}
