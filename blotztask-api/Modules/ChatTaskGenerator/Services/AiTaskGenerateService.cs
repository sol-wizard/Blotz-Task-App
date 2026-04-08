using Azure.AI.Projects;
using BlotzTask.Modules.ChatTaskGenerator.Constants;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.DTOs;
using BlotzTask.Modules.ChatTaskGenerator.Functions;
using BlotzTask.Shared.Exceptions;
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Foundry;
using Microsoft.Extensions.AI;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IAiTaskGenerateService
{
    Task<(AiGenerateMessage Message, AgentSession Session)> GenerateAiResponse(
        string userMessage,
        AgentSession? session,
        string preferredLanguage,
        DateTime userLocalTime,
        CancellationToken ct);
}

public class AiTaskGenerateService(
    ILogger<AiTaskGenerateService> logger,
    AIProjectClient projectClient,
    IConfiguration configuration)
    : IAiTaskGenerateService
{
    private readonly string _deploymentId =
        configuration["AzureOpenAI:AiModels:TaskGeneration:DeploymentId"]
        ?? throw new InvalidOperationException("Missing AzureOpenAI:AiModels:TaskGeneration:DeploymentId config.");

    public async Task<(AiGenerateMessage Message, AgentSession Session)> GenerateAiResponse(
        string userMessage,
        AgentSession? session,
        string preferredLanguage,
        DateTime userLocalTime,
        CancellationToken ct)
    {
        var collectedTasks = new List<ExtractedTask>();
        var collectedNotes = new List<ExtractedNote>();
        var tools = new TaskGenerationTools(collectedTasks, collectedNotes);

        try
        {
            var instructions = AiTaskGeneratorPrompts.GetSystemMessage(preferredLanguage, userLocalTime);

            var agent = projectClient.AsAIAgent(
                model: _deploymentId,
                instructions: instructions,
                tools: [AIFunctionFactory.Create(tools.CreateTask), AIFunctionFactory.Create(tools.CreateNote)]);

            // if (session == null)
            // {                                           
            //     session = await
            // agent.CreateSessionAsync();
            // }
            session ??= await agent.CreateSessionAsync();

            logger.LogInformation("TaskGeneration: Invoking AI with deployment={DeploymentId}", _deploymentId);

            await agent.RunAsync(userMessage, session, cancellationToken: ct);

            logger.LogInformation("TaskGeneration: Collected {TaskCount} tasks, {NoteCount} notes",
                collectedTasks.Count, collectedNotes.Count);

            var isSuccess = collectedTasks.Count > 0 || collectedNotes.Count > 0;

            var message = new AiGenerateMessage
            {
                IsSuccess = isSuccess,
                ExtractedTasks = collectedTasks,
                ExtractedNotes = collectedNotes,
                ErrorMessage = isSuccess ? "" : "Could not extract any tasks or notes from your input."
            };

            return (message, session);
        }
        catch (OperationCanceledException oce)
        {
            logger.LogInformation(oce, "AI task generation cancelled.");
            throw new AiTaskGenerationException(AiErrorCode.Canceled, "The request was canceled.", oce);
        }
        catch (Exception ex) when (
            ex.Message.Contains("429", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("quota", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("token", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(ex, "Token limit exceeded during AI task generation.");
            throw new AiTokenLimitedException();
        }
        catch (Exception ex) when (
            ex.Message.Contains("content_filter", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(ex, "Request blocked by content filter.");
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
