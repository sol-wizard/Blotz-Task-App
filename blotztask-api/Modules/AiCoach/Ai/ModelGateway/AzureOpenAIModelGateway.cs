using Azure.AI.OpenAI;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;
using OpenAI.Chat;
using System.Text;

namespace BlotzTask.Modules.AiCoach.Ai.ModelGateway;

/// <summary>
/// Azure OpenAI implementation of the gateway. Uses the shared <see cref="AzureOpenAIClient"/>
/// (API-key credential — NOT AIProjectClient, which needs az login locally; see
/// Modules/Reviews/Commands/GenerateReview.cs for the established pattern).
/// </summary>
public sealed class AzureOpenAiModelGateway(
    AzureOpenAIClient azureOpenAiClient,
    IOptions<AiCoachModuleOptions> options) : IModelGateway
{
    public async Task<ModelCompletionResult> CompleteAsync(
        ModelGatewayRequest request,
        CancellationToken cancellationToken)
    {
        var chatClient = azureOpenAiClient.GetChatClient(options.Value.DeploymentId);

        var messages = new List<ChatMessage> { new SystemChatMessage(request.SystemPrompt) };
        foreach (var message in request.Messages)
        {
            messages.Add(message switch
            {
                GatewayUserMessage user => new UserChatMessage(user.Content),
                GatewaySystemMessage system => new SystemChatMessage(system.Content),
                GatewayAssistantMessage assistant => ToAssistantMessage(assistant),
                GatewayToolResultMessage tool => new ToolChatMessage(tool.ToolCallId, tool.Content),
                _ => throw new InvalidOperationException($"Unsupported gateway message {message.GetType().Name}."),
            });
        }

        var chatOptions = new ChatCompletionOptions();
        if (request.MaxOutputTokens is { } maxTokens)
        {
            // Azure deployment aliases do not expose the underlying model family to the SDK.
            // Send the modern completion budget explicitly instead of SDK-inferred max_tokens.
#pragma warning disable SCME0001 // SDK extension-data API; confined to the Azure adapter.
            chatOptions.Patch.Set("$.max_completion_tokens"u8, maxTokens);
#pragma warning restore SCME0001
        }

        foreach (var tool in request.Tools)
        {
            chatOptions.Tools.Add(ChatTool.CreateFunctionTool(
                tool.Name,
                tool.Description,
                BinaryData.FromString(tool.ParametersJsonSchema)));
        }

        if (request.OnTextDelta is not null)
        {
            var content = new StringBuilder();
            var tools = new SortedDictionary<int, (string Id, string Name, StringBuilder Arguments)>();
            ChatFinishReason? reason = null;
            ChatTokenUsage? usage = null;
            await foreach (var update in chatClient.CompleteChatStreamingAsync(messages, chatOptions, cancellationToken))
            {
                reason = update.FinishReason ?? reason;
                usage = update.Usage ?? usage;
                foreach (var part in update.ContentUpdate)
                {
                    if (string.IsNullOrEmpty(part.Text)) continue;
                    content.Append(part.Text);
                    await request.OnTextDelta(part.Text);
                }
                foreach (var tool in update.ToolCallUpdates)
                {
                    if (!tools.TryGetValue(tool.Index, out var value)) value = (string.Empty, string.Empty, new());
                    value.Id = tool.ToolCallId ?? value.Id;
                    value.Name = tool.FunctionName ?? value.Name;
                    if (tool.FunctionArgumentsUpdate is not null) value.Arguments.Append(tool.FunctionArgumentsUpdate.ToString());
                    tools[tool.Index] = value;
                }
            }
            return new(content.Length == 0 ? null : content.ToString(),
                tools.Values.Select(tool => new ModelToolCallRequest(tool.Id, tool.Name, tool.Arguments.ToString())).ToArray(),
                MapFinishReason(reason), usage?.InputTokenCount ?? 0, usage?.OutputTokenCount ?? 0, usage?.TotalTokenCount ?? 0,
                usage?.InputTokenDetails?.CachedTokenCount ?? 0);
        }

        var response = await chatClient.CompleteChatAsync(messages, chatOptions, cancellationToken);
        var completion = response.Value;

        var toolCalls = completion.ToolCalls
            .Select(c => new ModelToolCallRequest(c.Id, c.FunctionName, c.FunctionArguments.ToString()))
            .ToList();

        var text = completion.Content.Count > 0 ? completion.Content[0].Text : null;

        var finishReason = MapFinishReason(completion.FinishReason);

        return new ModelCompletionResult(
            text,
            toolCalls,
            finishReason,
            completion.Usage?.InputTokenCount ?? 0,
            completion.Usage?.OutputTokenCount ?? 0,
            completion.Usage?.TotalTokenCount ?? 0,
            completion.Usage?.InputTokenDetails?.CachedTokenCount ?? 0);
    }

    private static ModelFinishReason MapFinishReason(ChatFinishReason? reason) => reason switch
        {
            ChatFinishReason.Stop => ModelFinishReason.Stop,
            ChatFinishReason.ToolCalls => ModelFinishReason.ToolCalls,
            ChatFinishReason.ContentFilter => ModelFinishReason.ContentFilter,
            ChatFinishReason.Length => ModelFinishReason.Length,
            _ => ModelFinishReason.Other,
        };

    private static AssistantChatMessage ToAssistantMessage(GatewayAssistantMessage assistant)
    {
        if (assistant.ToolCalls.Count == 0)
            return new AssistantChatMessage(assistant.Content ?? string.Empty);

        var toolCalls = assistant.ToolCalls
            .Select(c => ChatToolCall.CreateFunctionToolCall(c.Id, c.Name, BinaryData.FromString(c.ArgumentsJson)))
            .ToList();

        var message = new AssistantChatMessage(toolCalls);
        if (!string.IsNullOrEmpty(assistant.Content))
            message.Content.Add(ChatMessageContentPart.CreateTextPart(assistant.Content));
        return message;
    }
}
