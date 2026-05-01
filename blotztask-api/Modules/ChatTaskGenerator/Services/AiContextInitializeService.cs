using System.Diagnostics;
using BlotzTask.Modules.ChatTaskGenerator.Clients;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Functions;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IAiContextInitializeService
{
    Task<AiChatContext> InitializeAsync(string prompt,  CancellationToken ct);
}

public class AiContextInitializeService( 
    TaskClient taskClient, 
    ILogger<AiContextInitializeService> logger)
    : IAiContextInitializeService
{
    public async Task<AiChatContext> InitializeAsync(string prompt, CancellationToken ct)
    {
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
}