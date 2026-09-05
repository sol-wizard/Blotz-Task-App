using Azure.AI.OpenAI;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;
using OpenAI.Chat;

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
                GatewaySystemMessage system => new SystemChatMessage(system.Content),
                GatewayUserMessage user => new UserChatMessage(user.Content),
                GatewayAssistantMessage assistant => ToAssistantMessage(assistant),
                GatewayToolResultMessage tool => new ToolChatMessage(tool.ToolCallId, tool.Content),
                _ => throw new InvalidOperationException($"Unsupported gateway message {message.GetType().Name}."),
            });
        }

        var chatOptions = new ChatCompletionOptions();

        if (request.ResponseFormat is not null)
        {
            chatOptions.ResponseFormat = ChatResponseFormat.CreateJsonSchemaFormat(
                request.ResponseFormat.Name,
                BinaryData.FromString(request.ResponseFormat.JsonSchema),
                jsonSchemaIsStrict: true);
        }

        foreach (var tool in request.Tools)
        {
            chatOptions.Tools.Add(ChatTool.CreateFunctionTool(
                tool.Name,
                tool.Description,
                BinaryData.FromString(tool.ParametersJsonSchema)));
        }

        var response = await chatClient.CompleteChatAsync(messages, chatOptions, cancellationToken);
        var completion = response.Value;

        var toolCalls = completion.ToolCalls
            .Select(c => new ModelToolCallRequest(c.Id, c.FunctionName, c.FunctionArguments.ToString()))
            .ToList();

        var text = completion.Content.Count > 0 ? completion.Content[0].Text : null;

        var finishReason = completion.FinishReason switch
        {
            ChatFinishReason.Stop => ModelFinishReason.Stop,
            ChatFinishReason.ToolCalls => ModelFinishReason.ToolCalls,
            ChatFinishReason.ContentFilter => ModelFinishReason.ContentFilter,
            ChatFinishReason.Length => ModelFinishReason.Length,
            _ => ModelFinishReason.Other,
        };

        return new ModelCompletionResult(
            text,
            toolCalls,
            finishReason,
            completion.Usage?.InputTokenCount ?? 0,
            completion.Usage?.OutputTokenCount ?? 0,
            completion.Usage?.TotalTokenCount ?? 0);
    }

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
