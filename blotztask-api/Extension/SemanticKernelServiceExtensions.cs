using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Extension;

public static class SemanticKernelServiceExtensions
{
    public static IServiceCollection AddSemanticKernelServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Register the Kernel as a singleton service
        services.AddSingleton<Kernel>(sp =>
        {
            var endpoint = configuration["AzureOpenAI:Endpoint"];
            var deploymentId = configuration["AzureOpenAI:DeploymentId"];
            var apiKey = configuration["AzureOpenAI:ApiKey"];

            var kernelBuilder = Kernel.CreateBuilder();

            kernelBuilder.AddAzureOpenAIChatCompletion(
                deploymentId,
                endpoint,
                apiKey
            );

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

