using System.Text.Json;
using Microsoft.SemanticKernel.ChatCompletion; // For improved fallback deserialization if needed
using OpenAI.Chat;

namespace BlotzTask.Shared.Services;

public class AiChatToolService // Renamed to a more descriptive class name
{
    private readonly ChatClient _chatClient;

    public AiChatToolService(ChatClient chatClient)
    {
        _chatClient = chatClient ?? throw new ArgumentNullException(nameof(chatClient));
    }

    /// <summary>
    /// Calls an OpenAI tool and attempts to deserialize its arguments into the specified type.
    /// </summary>
    /// <typeparam name="T">The target type for deserialization.</typeparam>
    /// <param name="toolFunctionName">The name of the tool function to look for.</param>
    /// <param name="messages">The list of chat messages to send to the AI.</param>
    /// <param name="tool">The specific tool definition to make available to the AI.</param>
    /// <param name="cancellationToken">A token to observe for cancellation requests.</param>
    /// <param name="fallbackDeserializer">An optional function to attempt deserialization if the primary method fails.</param>
    /// <returns>An instance of <typeparamref name="T"/> if successful, otherwise null.</returns>
    
    public async Task<T?> CallToolAndDeserializeAsync<T>(
        string toolFunctionName,
        List<ChatMessage> messages,
        ChatTool tool,
        CancellationToken cancellationToken,
        Func<string, T?>? fallbackDeserializer = null
    )
        where T : class
    {
        ChatCompletionOptions options = new() { Tools = { tool } };

        try
        {
            ChatCompletion completion = await _chatClient.CompleteChatAsync(
                messages,
                options,
                cancellationToken
            );

            // No tool was called by the AI
            if (completion.ToolCalls.Count == 0)
            {
                Console.WriteLine($"[AI Warning] No tool call triggered for '{toolFunctionName}'.");
                return null;
            }

            // Find the specific tool call matching the desired function name
            var toolCall = completion.ToolCalls.FirstOrDefault(tc =>
                tc.FunctionName == toolFunctionName
            );

            if (toolCall == null)
            {
                Console.WriteLine(
                    $"[AI Warning] Tool function '{toolFunctionName}' was not called by the AI, or another tool was called instead."
                );
                return null;
            }

            T? result = null;
            try
            {
                // Attempt to deserialize the tool function arguments directly
                result = toolCall.FunctionArguments.ToObjectFromJson<T>();
                Console.WriteLine($"Tool JSON arguments: {toolCall.FunctionArguments}");
            }
            catch (JsonException ex) // Catch specific JSON deserialization errors
            {
                Console.WriteLine(
                    $"[AI Error] JSON deserialization failed for '{toolFunctionName}': {ex.Message}"
                );
                // Fall through to attempt fallback deserializer
            }
            catch (Exception ex) // Catch other potential deserialization errors
            {
                Console.WriteLine(
                    $"[AI Error] An unexpected error occurred during deserialization for '{toolFunctionName}': {ex.Message}"
                );
                // Fall through to attempt fallback deserializer
            }


            // If primary deserialization failed and a fallback is provided, attempt it
            if (result == null && fallbackDeserializer != null)
            {
                Console.WriteLine("[AI Debug] Primary deserialization failed or returned null. Attempting fallback deserializer...");
                try
                {
                    result = fallbackDeserializer(toolCall.FunctionArguments.ToString());
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[AI Error] Fallback deserializer threw an exception for '{toolFunctionName}': {ex.Message}");
                }
            }

            if (result == null)
            {
                Console.WriteLine(
                    $"[AI Error] Deserialization (primary and fallback if provided) returned null for '{toolFunctionName}'."
                );
            }

            return result;
        }
        catch (Exception ex) // Catch any exceptions during the API call itself
        {
            Console.WriteLine(
                $"[AI Error] Exception during OpenAI tool call for '{toolFunctionName}': {ex.Message}"
            );
            return null;
        }
    }
}
