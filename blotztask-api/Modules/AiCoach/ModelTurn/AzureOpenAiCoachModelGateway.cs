using System.ClientModel;
using System.Text.Json;
using System.Text.Json.Serialization;
using Azure.AI.OpenAI;
using BlotzTask.Extension.Options;
using BlotzTask.Modules.AiUsage.Exceptions;
using BlotzTask.Modules.AiUsage.Services;
using OpenAI.Chat;

namespace BlotzTask.Modules.AiCoach.ModelTurn;

public sealed class AzureOpenAiCoachModelGateway(
    IServiceProvider services,
    IConfiguration configuration,
    ICheckAiQuotaService quota,
    IRecordAiUsageService usage,
    ILogger<AzureOpenAiCoachModelGateway> logger) : IAiCoachModelGateway
{
    private const string OutcomeSchema = """
    {
      "type": "object",
      "properties": {
        "kind": { "type": "string", "enum": ["reply", "clarification"] },
        "assistantMessage": { "type": "string" },
        "missingField": {
          "anyOf": [
            { "type": "string", "enum": ["task_scope", "date", "start_time", "duration"] },
            { "type": "null" }
          ]
        },
        "scheduleRecommendation": {
          "anyOf": [
            {
              "type": "object",
              "properties": {
                "date": { "type": "string" },
                "startTime": { "type": "string" },
                "durationMinutes": { "type": "integer" },
                "timeZoneId": { "type": "string" }
              },
              "required": ["date", "startTime", "durationMinutes", "timeZoneId"],
              "additionalProperties": false
            },
            { "type": "null" }
          ]
        }
      },
      "required": ["kind", "assistantMessage", "missingField", "scheduleRecommendation"],
      "additionalProperties": false
    }
    """;

    private static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();
    private readonly string _endpoint = configuration[$"{AzureOpenAIOptions.SectionName}:Endpoint"] ?? string.Empty;
    private readonly string _apiKey = configuration[$"{AzureOpenAIOptions.SectionName}:ApiKey"] ?? string.Empty;
    private readonly string _deploymentId = configuration[
        $"{AzureOpenAIOptions.SectionName}:AiModels:TaskGeneration:DeploymentId"] ?? string.Empty;

    public async Task<ModelGatewayResponse> GenerateAsync(
        ModelGatewayRequest request,
        CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(_endpoint, UriKind.Absolute, out _)
            || string.IsNullOrWhiteSpace(_apiKey)
            || string.IsNullOrWhiteSpace(_deploymentId))
            return Failure("model_gateway_not_configured");
        if (request.Tools.Count != 0 || request.ToolResults.Count != 0)
            return Failure("clarification_toolset_must_be_empty");

        try
        {
            await quota.CheckQuotaAsync(request.UserId, cancellationToken);

            var messages = BuildMessages(request);
            var completionOptions = new ChatCompletionOptions
            {
                AllowParallelToolCalls = false,
                ResponseFormat = ChatResponseFormat.CreateJsonSchemaFormat(
                    "ai_coach_turn",
                    BinaryData.FromString(OutcomeSchema),
                    jsonSchemaIsStrict: true)
            };

            foreach (var tool in request.Tools)
            {
                completionOptions.Tools.Add(ChatTool.CreateFunctionTool(
                    tool.Name,
                    tool.Description,
                    BinaryData.FromString(tool.InputSchema.GetRawText()),
                    functionSchemaIsStrict: true));
            }

            var completion = await services.GetRequiredService<AzureOpenAIClient>()
                .GetChatClient(_deploymentId)
                .CompleteChatAsync(messages, completionOptions, cancellationToken);

            if (completion.Value.FinishReason == ChatFinishReason.ContentFilter)
                return Failure("content_filtered");

            if (completion.Value.ToolCalls.Count > 0)
            {
                var toolCalls = completion.Value.ToolCalls.Select(toolCall =>
                {
                    using var arguments = JsonDocument.Parse(toolCall.FunctionArguments);
                    return new ModelToolCall(toolCall.FunctionName, arguments.RootElement.Clone());
                }).ToArray();
                return new ModelGatewayResponse(null, toolCalls, false, null);
            }

            var content = completion.Value.Content.FirstOrDefault()?.Text;
            if (string.IsNullOrWhiteSpace(content))
                return Failure("empty_model_response");

            ControlledModelOutcome? outcome;
            try
            {
                outcome = JsonSerializer.Deserialize<ControlledModelOutcome>(content, JsonOptions);
            }
            catch (JsonException exception)
            {
                logger.LogWarning(exception, "AI Coach model returned an invalid controlled outcome.");
                return Failure("invalid_model_response");
            }

            var validationFailure = Validate(outcome);
            if (validationFailure is not null)
                return Failure(validationFailure);

            if (completion.Value.Usage is not null)
            {
                await usage.RecordAiUsageAsync(new RecordAiUsageRequest
                {
                    UserId = request.UserId,
                    InputTokens = (int)completion.Value.Usage.InputTokenCount,
                    OutputTokens = (int)completion.Value.Usage.OutputTokenCount,
                    TotalTokens = (int)completion.Value.Usage.TotalTokenCount
                }, cancellationToken);
            }

            return new ModelGatewayResponse(outcome, [], true, null);
        }
        catch (AiQuotaExceededException)
        {
            return Failure("quota_exceeded");
        }
        catch (ClientResultException exception) when (exception.Status == 429)
        {
            logger.LogWarning(exception, "AI Coach model request was rate limited.");
            return Failure("rate_limited");
        }
        catch (ClientResultException exception) when (
            exception.Status == 400
            && exception.Message.Contains("content_filter", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(exception, "AI Coach model request was blocked by the content filter.");
            return Failure("content_filtered");
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "AI Coach model request failed for deployment {DeploymentId}.", _deploymentId);
            return Failure("model_unavailable");
        }
    }

    private static List<ChatMessage> BuildMessages(ModelGatewayRequest request)
    {
        var messages = new List<ChatMessage>();
        foreach (var segment in request.Prompt.Segments)
            messages.Add(new SystemChatMessage(segment.Content));

        messages.Add(new SystemChatMessage($"""
            Current state: {request.Memory.CurrentState}
            Clarification turns completed: {request.Memory.ClarificationProgress.CompletedTurns}
            Current open question: {request.Memory.ClarificationProgress.OpenQuestion ?? "none"}
            User timezone: {request.Memory.UserTimeZoneId}
            Return kind=clarification with exactly one missingField when asking a question. A schedule recommendation must be explicit in assistantMessage.
            """));

        foreach (var message in request.Memory.RecentMessages)
        {
            messages.Add(message.Role == Domain.ConversationMessageRole.User
                ? new UserChatMessage(message.Content)
                : new AssistantChatMessage(message.Content));
        }
        return messages;
    }

    private static string? Validate(ControlledModelOutcome? outcome)
    {
        if (outcome is null || string.IsNullOrWhiteSpace(outcome.AssistantMessage)
            || outcome.AssistantMessage.Length > 10_000)
            return "invalid_model_response";

        if (outcome.Kind == ControlledModelOutcomeKind.Clarification)
        {
            if (outcome.MissingField is null)
                return "clarification_missing_field_required";
            var questionMarks = outcome.AssistantMessage.Count(character => character is '?' or '？');
            if (questionMarks != 1)
                return "clarification_must_contain_one_question";
        }
        else if (outcome.MissingField is not null)
        {
            return "reply_cannot_declare_missing_field";
        }

        if (outcome.ScheduleRecommendation is { } schedule)
        {
            if (!DateOnly.TryParse(schedule.Date, out _)
                || !TimeOnly.TryParse(schedule.StartTime, out _)
                || schedule.DurationMinutes is <= 0 or > 1_440
                || !IsValidTimeZone(schedule.TimeZoneId)
                || !outcome.AssistantMessage.Contains(schedule.StartTime, StringComparison.Ordinal)
                || !outcome.AssistantMessage.Contains(
                    schedule.DurationMinutes.ToString(System.Globalization.CultureInfo.InvariantCulture),
                    StringComparison.Ordinal))
                return "invalid_schedule_recommendation";
        }
        return null;
    }

    private static bool IsValidTimeZone(string timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId)) return false;
        try
        {
            _ = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            return true;
        }
        catch (Exception exception) when (exception is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return false;
        }
    }

    private static ModelGatewayResponse Failure(string code) => new(null, [], false, code);

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = false,
            UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow
        };
        options.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower));
        return options;
    }
}
