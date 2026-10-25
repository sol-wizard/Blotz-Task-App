using Azure.AI.OpenAI;
using Azure;
using System.ClientModel.Primitives;
using BlotzTask.Extension.Options;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Ai.ModelGateway;

/// <summary>Selects once, then owns the adapter and provider state for that turn.</summary>
public sealed class ConfiguredModelGateway(AzureOpenAIClient azureClient, IHttpClientFactory httpClients,
    IOptions<AzureOpenAIOptions> azureOptions, IOptions<AiCoachModuleOptions> options,
    AiCoachDailyBudget budget, ILogger<BudgetedModelGateway> budgetLogger) : IModelGateway
{
    private readonly HttpClient _responsesClient = httpClients.CreateClient("AiCoachResponses");
    // One reservation covers one provider attempt. An automatic SDK retry after a lost response
    // could otherwise create a second billed request without a second reservation.
    private readonly AzureOpenAIClient _coachClient = budget.Enabled
        ? new AzureOpenAIClient(new Uri(azureOptions.Value.Endpoint), new AzureKeyCredential(azureOptions.Value.ApiKey),
            new AzureOpenAIClientOptions { RetryPolicy = new ClientRetryPolicy(0) })
        : azureClient;

    public IModelGateway OpenTurn()
    {
        var profile = AiCoachModelProfile.Select(options.Value);
        IModelGateway adapter = profile.Api switch
        {
            "ChatCompletions" => new AzureOpenAiModelGateway(_coachClient,
                Options.Create(new AiCoachModuleOptions { DeploymentId = profile.DeploymentId })),
            "Responses" => new AzureResponsesModelGateway(_responsesClient,
                azureOptions.Value.Endpoint, azureOptions.Value.ApiKey, profile),
            _ => throw new InvalidOperationException($"Unsupported AI Coach API '{profile.Api}'."),
        };
        return new BudgetedModelGateway(adapter, profile, budget,
            options.Value.ContextTokenBudget, budgetLogger);
    }

    // Single-call consumers, such as background digests, also get isolated provider state.
    public Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken) =>
        OpenTurn().CompleteAsync(request, cancellationToken);

}
