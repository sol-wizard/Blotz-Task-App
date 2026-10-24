using BlotzTask.Extension.Options;
using BlotzTask.Modules.AiCoach;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

public sealed class ModelProfileTests
{
    [Theory]
    [InlineData("luna", "gpt-5.6-luna", "ChatCompletions")]
    [InlineData("sol", "gpt-6.1-sol", "Responses")]
    public void Handle_NamedProfile_SelectsConfiguredTransport(string name, string deployment, string api)
    {
        // Arrange
        using var provider = Provider(name);
        var options = provider.GetRequiredService<IOptions<AiCoachModuleOptions>>().Value;

        // Act
        var selected = AiCoachModelProfile.Select(options);
        options.Models[name].DeploymentId = "changed-after-selection";

        // Assert
        selected.DeploymentId.Should().Be(deployment, because: "a turn retains an immutable selection");
        selected.Api.Should().Be(api, because: "Sol tools require Responses while Luna retains its existing transport");
    }

    [Theory]
    [InlineData("AiCoach:DefaultModel", "missing")]
    [InlineData("AiCoach:Models:sol:Api", "ChatCompletions")]
    [InlineData("AiCoach:Models:sol:ReasoningEffort", "none")]
    [InlineData("AiCoach:Models:sol:MaxOutputTokens", "0")]
    [InlineData("AiCoach:Models:sol:RequestTimeoutSeconds", "0")]
    [InlineData("AiCoach:Models:sol:DeploymentId", "")]
    [InlineData("AiCoach:Models:sol:InputTokenUsdPerMillion", "-1")]
    [InlineData("AiCoach:Models:sol:OutputTokenUsdPerMillion", "-1")]
    public void Handle_InvalidProfile_RejectsConfiguration(string key, string value)
    {
        // Arrange
        using var provider = Provider("sol", key, value);

        // Act
        var resolve = () => provider.GetRequiredService<IOptions<AiCoachModuleOptions>>().Value;

        // Assert
        resolve.Should().Throw<OptionsValidationException>(because: "invalid model settings must fail before serving requests");
    }

    [Fact]
    public void Handle_LegacyDeployment_RetainsExistingSelection()
    {
        // Arrange
        using var provider = Provider("");
        var options = provider.GetRequiredService<IOptions<AiCoachModuleOptions>>().Value;

        // Act
        var selected = AiCoachModelProfile.Select(options);

        // Assert
        selected.DeploymentId.Should().Be("existing-deployment", because: "environments without named selection keep their existing deployment");
        selected.Api.Should().Be("ChatCompletions", because: "legacy environments retain their transport");
    }

    [Fact]
    public void Handle_MixedModelUsage_AccumulatesCostsAtOriginalRates()
    {
        // Arrange
        var tracker = new AiCoachUsageTracker();
        var id = Guid.NewGuid();
        var first = new AiCoachModelProfile("first", "a", "ChatCompletions", null, 4096, 60, 1m, 0.1m, 2m);
        var second = first with { Name = "second", InputTokenUsdPerMillion = 10m, OutputTokenUsdPerMillion = 20m };

        // Act
        tracker.Add(id, 1000, 100, 1100, 1, first.EstimateUsd(1000, 500, 100));
        var usage = tracker.Add(id, 1000, 100, 1100, 1, second.EstimateUsd(1000, 0, 100));
        var unknown = tracker.Add(id, 1, 1, 2, 1);

        // Assert
        usage.EstimatedUsd.Should().Be(0.01275m, because: "cached tokens and different model rates are priced on each turn");
        unknown.EstimatedUsd.Should().BeNull(because: "an incomplete cost total must not look like a complete estimate");
    }

    private static ServiceProvider Provider(string model, string? key = null, string? value = null)
    {
        var root = Evaluation.CoachEvaluationHarness.FindRepository();
        var overrides = new Dictionary<string, string?> { ["AiCoach:DefaultModel"] = model };
        if (key is not null) overrides[key] = value;
        var configuration = new ConfigurationBuilder().AddJsonFile(Path.Combine(root, "blotztask-api", "appsettings.json"))
            .AddInMemoryCollection(overrides).Build();
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(configuration);
        services.Configure<AzureOpenAIOptions>(azure => azure.AiModels.TaskGeneration.DeploymentId = "existing-deployment");
        services.AddAiCoachModule();
        return services.BuildServiceProvider();
    }
}
