using System.Diagnostics;
using Azure.AI.Projects;
using BlotzTask.Modules.ChatTaskGenerator.Constants;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Functions;
using BlotzTask.Shared.Exceptions;
using Microsoft.Extensions.AI;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IAiTaskGenerateService
{
    Task<AiChatContext> InitializeAsync(string preferredLanguage, DateTime userLocalTime, TimeZoneInfo timeZone, CancellationToken ct);
    Task<AiGenerateMessage> GenerateAiResponse(string userMessage, AiChatContext context, CancellationToken ct);
}

public class AiTaskGenerateService(
    ILogger<AiTaskGenerateService> logger,
    AIProjectClient projectClient,
    IConfiguration configuration)
    : IAiTaskGenerateService
{
    //TODO: This should not be here ? should be at DI?
    private readonly string _deploymentId =
        configuration["AzureOpenAI:AiModels:TaskGeneration:DeploymentId"]
        ?? throw new InvalidOperationException("Missing AzureOpenAI:AiModels:TaskGeneration:DeploymentId config.");

    public async Task<AiChatContext> InitializeAsync(string preferredLanguage, DateTime userLocalTime, TimeZoneInfo timeZone, CancellationToken ct)
    {
        //TODO: Do we have a better way of manage those list ?
        var tasks = new List<ExtractedTask>();
        var notes = new List<ExtractedNote>();
        var tools = new TaskGenerationTools(tasks, notes);
        
        var agentSw = Stopwatch.StartNew();
        var agent = projectClient.AsAIAgent(
            model: _deploymentId,
            instructions: AiTaskGeneratorPrompts.GetSystemMessage(preferredLanguage, userLocalTime),
            tools:
            [
                AIFunctionFactory.Create(tools.CreateTask),
                AIFunctionFactory.Create(tools.CreateNote),
                AIFunctionFactory.Create(tools.RemoveTask),
                AIFunctionFactory.Create(tools.UpdateTask),
                AIFunctionFactory.Create(tools.RemoveNote),
                AIFunctionFactory.Create(tools.UpdateNote)
            ]);
        var agentCreatedMs = agentSw.ElapsedMilliseconds;

        //TODO: De we need cancellation token here ?
        var session = await agent.CreateSessionAsync();
        agentSw.Stop();

        logger.LogInformation(
            "TaskGeneration: Session initialized for deployment={DeploymentId} | AgentCreated={AgentCreatedMs}ms | SessionCreated={SessionCreatedMs}ms",
            _deploymentId, agentCreatedMs, agentSw.ElapsedMilliseconds);

        return new AiChatContext
        {
            Agent = agent,
            Session = session,
            Tools = tools,
            Tasks = tasks,
            Notes = notes,
            TimeZone = timeZone
        };
    }

    public async Task<AiGenerateMessage> GenerateAiResponse(
        string userMessage,
        AiChatContext context,
        CancellationToken ct)
    {
        context.Tools.ResetCallCount();

        try
        {
            logger.LogInformation("TaskGeneration: Invoking AI with deployment={DeploymentId}", _deploymentId);

            var runSw = Stopwatch.StartNew();
            await context.Agent.RunAsync(userMessage, context.Session, cancellationToken: ct);
            runSw.Stop();

            logger.LogInformation(
                "TaskGeneration: RunAsync completed in {RunMs}ms | ToolCalls={ToolCallCount} | Tasks={TaskCount} | Notes={NoteCount}",
                runSw.ElapsedMilliseconds, context.Tools.ToolCallCount, context.Tasks.Count, context.Notes.Count);

            var isSuccess = context.Tools.ToolCallCount > 0;

            return new AiGenerateMessage
            {
                IsSuccess = isSuccess,
                ErrorCode = isSuccess ? "" : AiErrorCode.NoTasksExtracted.ToString(),
                ExtractedTasks = context.Tasks,
                ExtractedNotes = context.Notes,
                ErrorMessage = isSuccess ? "" : "Could not extract any tasks or notes from your input."
            };
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
