using BlotzTask.Filters;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Extension;

public static class SemanticKernelServiceExtensions
{
    public static IServiceCollection AddSemanticKernelServices(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment environment)
    {
        services.AddSingleton<Kernel>(sp =>
        {
            var endpoint = configuration["AzureOpenAI:Endpoint"];
            var deploymentId = configuration["AzureOpenAI:DeploymentId"];
            var apiKey = configuration["AzureOpenAI:ApiKey"];

            if (string.IsNullOrWhiteSpace(endpoint) ||
                string.IsNullOrWhiteSpace(deploymentId) ||
                string.IsNullOrWhiteSpace(apiKey))
            {
                throw new InvalidOperationException(
                    "Missing Azure OpenAI configuration. Set AzureOpenAI:Endpoint, AzureOpenAI:DeploymentId, and AzureOpenAI:ApiKey in configuration or via Key Vault reference.");
            }

            var kernelBuilder = Kernel.CreateBuilder();

            kernelBuilder.AddAzureOpenAIChatCompletion(
                deploymentId,
                endpoint,
                apiKey
            );

            kernelBuilder.Services.AddSingleton<IFunctionInvocationFilter>(
                new FunctionInvocationLoggingFilter(
                    sp.GetRequiredService<ILogger<FunctionInvocationLoggingFilter>>()));

            kernelBuilder.Services.AddSingleton<IPromptRenderFilter>(
                new PromptRenderLoggingFilter(
                    sp.GetRequiredService<ILogger<PromptRenderLoggingFilter>>()));

            return kernelBuilder.Build();
        });

        services.AddScoped<IChatCompletionService>(sp =>
        {
            var kernel = sp.GetRequiredService<Kernel>();
            return kernel.GetRequiredService<IChatCompletionService>();
        });

        return services;
    }
}
