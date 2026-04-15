using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Shared.Options;

public class AiModelOptions
{
    public const string SectionName = "AzureOpenAI:AiModels";

    public DeploymentConfig TaskGeneration { get; init; } = new();
    public DeploymentConfig Breakdown { get; init; } = new();
    public DeploymentConfig Speech { get; init; } = new();
}

public class DeploymentConfig
{
    [Required]
    public string DeploymentId { get; init; } = string.Empty;
}
