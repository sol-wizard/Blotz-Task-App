using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Extension.Options;

public sealed class AzureOpenAIOptions
{
    // Must match the section name in appsettings.json. Change it here if you rename it there.
    public const string SectionName = "AzureOpenAI";

    [Required]
    public string Endpoint { get; set; } = "";

    [Required]
    public string ApiKey { get; set; } = "";

    public AiModelsOptions AiModels { get; set; } = new();
}

public sealed class AiModelsOptions
{
    public ModelDeploymentOptions TaskGeneration { get; set; } = new();

    public ModelDeploymentOptions Breakdown { get; set; } = new();
}

public sealed class ModelDeploymentOptions
{
    public string DeploymentId { get; set; } = "";
}
