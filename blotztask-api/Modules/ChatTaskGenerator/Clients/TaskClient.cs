using Azure.AI.Projects;
using BlotzTask.Modules.ChatTaskGenerator.Functions;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;

namespace BlotzTask.Modules.ChatTaskGenerator.Clients;

public class TaskClient(AIProjectClient client, string deploymentId)
{
    public string DeploymentId => deploymentId;


    public ChatClientAgent GetTaskAgent(string prompt, TaskGenerationTools  tools)
    {
        return client.AsAIAgent(model: deploymentId,
            instructions: prompt,
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
    }
    
    
}
