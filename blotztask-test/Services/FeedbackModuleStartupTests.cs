using BlotzTask.Extension.Options;
using BlotzTask.Modules.Feedback;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.Services;

public class FeedbackModuleStartupTests
{
    private sealed class FakeHostEnvironment(string environmentName) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = environmentName;
        public string ApplicationName { get; set; } = "BlotzTask.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    // Same shape as appsettings.json: the Lark section is there, but every value is empty.
    private static IConfiguration EmptyLarkConfiguration() =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Lark:AppId"] = "",
                ["Lark:AppSecret"] = "",
                ["Lark:FeedbackBaseToken"] = "",
                ["Lark:FeedbackTableId"] = ""
            })
            .Build();

    private static ServiceProvider BuildProvider(string environmentName) =>
        new ServiceCollection()
            .AddFeedbackModule(EmptyLarkConfiguration(), new FakeHostEnvironment(environmentName))
            .BuildServiceProvider();

    [Fact]
    public void Development_WithoutLarkSettings_DoesNotBlockStartup()
    {
        // Arrange
        using var provider = BuildProvider(Environments.Development);

        // Act
        var act = () => provider.GetService<IStartupValidator>()?.Validate();

        // Assert
        act.Should().NotThrow(because: "a local dev without Lark keys must still be able to start the API");
    }

    [Fact]
    public void Development_WithoutLarkSettings_FailsWhenFeedbackReadsTheSettings()
    {
        // Arrange
        using var provider = BuildProvider(Environments.Development);

        // Act
        var act = () => provider.GetRequiredService<IOptions<LarkOptions>>().Value;

        // Assert
        act.Should().Throw<OptionsValidationException>(
            because: "submitting feedback without Lark settings must still fail loudly, just not at startup");
    }

    [Theory]
    [InlineData("Staging")]
    [InlineData("Production")]
    public void DeployedEnvironment_WithoutLarkSettings_FailsAtStartup(string environmentName)
    {
        // Arrange
        using var provider = BuildProvider(environmentName);

        // Act
        var act = () => provider.GetRequiredService<IStartupValidator>().Validate();

        // Assert
        act.Should().Throw<OptionsValidationException>(
            because: "staging and prod must refuse to start when the Lark settings are missing");
    }
}
