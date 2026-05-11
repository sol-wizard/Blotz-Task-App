using Azure.AI.OpenAI;
using BlotzTask.Extension;
using BlotzTask.Modules.MonthlyReviews.Prompts;
using BlotzTask.Shared.Exceptions;
using OpenAI.Chat;

namespace BlotzTask.Modules.MonthlyReviews.Services;

public record MonthlyReviewAiResult(string AiGeneratedLetter, string AiModel);

public interface IMonthlyReviewAiService
{
    Task<MonthlyReviewAiResult> GenerateLetterAsync(
        string preferredLanguage,
        string monthLabel,
        string taskJson,
        CancellationToken ct = default);
}

public class MonthlyReviewAiService(
    AzureOpenAIClient azureOpenAIClient,
    AgentFrameworkServiceExtensions.AzureAIOptions aiOptions,
    ILogger<MonthlyReviewAiService> logger) : IMonthlyReviewAiService
{
    // TODO: Reusing the Breakdown deployment for v1. ReasoningEffortLevel is only honoured on
    // o-series reasoning models — if Breakdown points at a non-reasoning model (e.g. GPT-4o),
    // the option is ignored. Revisit once we decide whether monthly review needs its own
    // deployment (likely a reasoning model for better reflection quality).
    private readonly string _deploymentId = aiOptions.BreakdownDeploymentId;

    public async Task<MonthlyReviewAiResult> GenerateLetterAsync(
        string preferredLanguage,
        string monthLabel,
        string taskJson, 
        CancellationToken ct = default)
    {
        var prompt = MonthlyReviewPrompts.GetMonthlyReviewPrompt(preferredLanguage, monthLabel, taskJson);
        var chatClient = azureOpenAIClient.GetChatClient(_deploymentId);

#pragma warning disable OPENAI001 // ReasoningEffortLevel is experimental in Azure.AI.OpenAI 2.8.0-beta.
        var options = new ChatCompletionOptions
        {
            ReasoningEffortLevel = ChatReasoningEffortLevel.Medium
        };
#pragma warning restore OPENAI001

        try
        {
            logger.LogInformation(
                "Generating monthly review letter (deployment={DeploymentId}, language={Language}, month={Month})",
                _deploymentId, preferredLanguage, monthLabel);

            var response = await chatClient.CompleteChatAsync(
                new ChatMessage[] { new UserChatMessage(prompt) },
                options,
                ct);

            var letter = response.Value.Content.Count > 0
                ? response.Value.Content[0].Text ?? string.Empty
                : string.Empty;

            if (string.IsNullOrWhiteSpace(letter))
            {
                logger.LogWarning("AI returned empty letter for monthly review (deployment={DeploymentId})", _deploymentId);
                throw new AiTaskGenerationException(
                    AiErrorCode.EmptyResponse,
                    "AI returned an empty monthly review letter.");
            }

            logger.LogInformation(
                "Monthly review generated (deployment={DeploymentId}, length={Length})",
                _deploymentId, letter.Length);

            return new MonthlyReviewAiResult(letter, _deploymentId);
        }
        catch (OperationCanceledException oce)
        {
            logger.LogWarning(oce, "Monthly review generation canceled");
            throw new AiTaskGenerationException(AiErrorCode.Canceled, "The request was canceled.", oce);
        }
        //TODO : Handle this more gracefully once the error updated pr merge
        catch (Exception ex) when (
            ex.Message.Contains("429", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("quota", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("token", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(ex, "Token / rate limit hit while generating monthly review");
            throw new AzureAiException();
        }
        catch (Exception ex) when (
            ex.Message.Contains("content_filter", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(ex, "Content filter blocked monthly review generation");
            throw new AiContentFilterException();
        }
        catch (AiTaskGenerationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Unexpected error while generating monthly review");
            throw new AiTaskGenerationException(
                AiErrorCode.Unknown,
                "An unhandled exception occurred during monthly review generation.",
                ex);
        }
    }
}
