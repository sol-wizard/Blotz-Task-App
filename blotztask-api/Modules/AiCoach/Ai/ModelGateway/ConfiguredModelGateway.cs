using Azure.AI.OpenAI;
using BlotzTask.Extension.Options;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Ai.ModelGateway;

/// <summary>Selects once, then owns the adapter and provider state for that turn.</summary>
public sealed class ConfiguredModelGateway(AzureOpenAIClient azureClient, IHttpClientFactory httpClients,
    IOptions<AzureOpenAIOptions> azureOptions, IOptions<AiCoachModuleOptions> options) : IModelGateway
{
    private readonly HttpClient _responsesClient = httpClients.CreateClient("AiCoachResponses");

    public IModelGateway OpenTurn()
    {
        var profile = AiCoachModelProfile.Select(options.Value);
        IModelGateway adapter = profile.Api switch
        {
            "ChatCompletions" => new AzureOpenAiModelGateway(azureClient,
                Options.Create(new AiCoachModuleOptions { DeploymentId = profile.DeploymentId })),
            "Responses" => new AzureResponsesModelGateway(_responsesClient,
                azureOptions.Value.Endpoint, azureOptions.Value.ApiKey, profile),
            _ => throw new InvalidOperationException($"Unsupported AI Coach API '{profile.Api}'."),
        };
        return new SelectedGateway(adapter, profile);
    }

    // Single-call consumers, such as background digests, also get isolated provider state.
    public Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken) =>
        OpenTurn().CompleteAsync(request, cancellationToken);

    private sealed class SelectedGateway(IModelGateway adapter, AiCoachModelProfile profile) : IModelGateway
    {
        public AiCoachModelProfile Profile => profile;
        public Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken) =>
            adapter.CompleteAsync(request, cancellationToken);
    }
}
