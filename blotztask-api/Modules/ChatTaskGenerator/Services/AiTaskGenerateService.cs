using System.Diagnostics;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Modules.ChatTaskGenerator.Clients;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Functions;
using BlotzTask.Shared.Exceptions;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IAiTaskGenerateService
{
    Task<AiChatContext> InitializeAsync(string prompt,  CancellationToken ct);
    Task<AiGenerateMessage> GenerateAiResponse(Guid userId, string userMessage, AiChatContext context, CancellationToken ct);
}

public class AiTaskGenerateService(
    TaskClient taskClient,
    ILogger<AiTaskGenerateService> logger,
    IConfiguration configuration,
    ICheckAiQuotaService checkAiQuotaService,
    IRecordAiUsageService recordAiUsageService)
    : IAiTaskGenerateService
{
    public async Task<AiChatContext> InitializeAsync(string prompt, CancellationToken ct)
    {
        // TODO: Consider a clearer way to manage extracted task/note lists.
        var tasks = new List<ExtractedTask>();
        var notes = new List<ExtractedNote>();
        var tools = new TaskGenerationTools(tasks, notes);
        var agentSw = Stopwatch.StartNew();
        var agent = taskClient.GetTaskAgent(prompt, tools);
        var agentCreatedMs = agentSw.ElapsedMilliseconds;

        var session = await agent.CreateSessionAsync(ct);
        agentSw.Stop();

        logger.LogInformation(
            "TaskGeneration: Session initialized for deployment={DeploymentId} | AgentCreated={AgentCreatedMs}ms | SessionCreated={SessionCreatedMs}ms",
            taskClient.DeploymentId, agentCreatedMs, agentSw.ElapsedMilliseconds);

        return new AiChatContext
        {
            Agent = agent,
            Session = session,
            Tools = tools,
            Tasks = tasks,
            Notes = notes,
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

            logger.LogInformation("TaskGeneration: Invoking AI with deployment={DeploymentId}", taskClient.DeploymentId);

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
