using System.Diagnostics;
using Azure.AI.Projects;
using BlotzTask.Modules.AiUsage.Exceptions;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Modules.ChatTaskGenerator.Constants;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Functions;
using BlotzTask.Shared.Exceptions;
using Microsoft.Extensions.AI;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IAiTaskGenerateService
{
    Task<AiChatContext> InitializeAsync(string preferredLanguage, TimeZoneInfo timeZone, CancellationToken ct);
    Task<AiGenerateMessage> GenerateAiResponse(Guid userId, string userMessage, AiChatContext context, CancellationToken ct);
}

public class AiChatService(
    ILogger<AiChatService> logger,
    AIProjectClient projectClient,
    IConfiguration configuration,
    ICheckAiQuotaService checkAiQuotaService,
    IRecordAiUsageService recordAiUsageService)
    : IAiTaskGenerateService
{
    // TODO: Move deployment id resolution to DI/configuration.
    private readonly string _deploymentId =
        configuration["AzureOpenAI:AiModels:TaskGeneration:DeploymentId"]
        ?? throw new InvalidOperationException("Missing AzureOpenAI:AiModels:TaskGeneration:DeploymentId config.");

    public async Task<AiChatContext> InitializeAsync(string preferredLanguage, TimeZoneInfo timeZone, CancellationToken ct)
    {
        // TODO: Consider a clearer way to manage extracted task/note lists.
        var tasks = new List<ExtractedTask>();
        var notes = new List<ExtractedNote>();
        var tools = new TaskGenerationTools(tasks, notes);

        var userLocalTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);
        var agentSw = Stopwatch.StartNew();
        var agent = projectClient.AsAIAgent(
            model: _deploymentId,
            instructions: AiTaskGeneratorPrompts.GetSystemMessage(preferredLanguage, userLocalTime),
            tools:
            [
                AIFunctionFactory.Create(tools.CreateTask),
                AIFunctionFactory.Create(tools.CreateTasks),
                AIFunctionFactory.Create(tools.CreateNote),
                AIFunctionFactory.Create(tools.CreateNotes),
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
        Guid userId,
        string userMessage,
        AiChatContext context,
        CancellationToken ct)
    {
        context.Tools.ResetCallCount();

        try
        {
            await checkAiQuotaService.CheckQuotaAsync(userId, ct);

            logger.LogInformation("TaskGeneration: Invoking AI with deployment={DeploymentId}", _deploymentId);

            var runSw = Stopwatch.StartNew();
            var response = await context.Agent.RunAsync(userMessage, context.Session, cancellationToken: ct);
            runSw.Stop();

            int inputTokens = (int)(response.Usage?.InputTokenCount ?? 0);
            int outputTokens = (int)(response.Usage?.OutputTokenCount ?? 0);
            int totalTokens = (int)(response.Usage?.TotalTokenCount ?? 0);
            await recordAiUsageService.RecordAiUsageAsync(new RecordAiUsageRequest
            {
                UserId = userId,
                InputTokens = inputTokens,
                OutputTokens = outputTokens,
                TotalTokens = totalTokens
            }, ct);

            logger.LogInformation(
                "TaskGeneration: RunAsync completed in {RunMs}ms | InputTokens={InputTokens} | OutputTokens={OutputTokens} | TotalTokens={TotalTokens} | ToolCalls={ToolCallCount} | Tasks={TaskCount} | Notes={NoteCount}",
                runSw.ElapsedMilliseconds, inputTokens, outputTokens, totalTokens,
                context.Tools.ToolCallCount, context.Tasks.Count, context.Notes.Count);

            var isSuccess = context.Tools.ToolCallCount > 0;

            return new AiGenerateMessage
            {
                IsSuccess = isSuccess,
                ErrorCode = isSuccess ? "" : AiErrorCode.NoTasksExtracted.ToString(),
                ExtractedTasks = context.Tasks,
                ExtractedNotes = context.Notes,
                ErrorMessage = isSuccess ? "" : "Could not extract any tasks or notes from your input.",
                InputTokens = inputTokens,
                OutputTokens = outputTokens,
                TotalTokens = totalTokens
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
            throw new AzureAiException();
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