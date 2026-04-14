using Azure.AI.Projects;
using Azure.Identity;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace BlotzTask.Tests.Services;

/// <summary>
/// Integration tests for AiTaskGenerateService.
/// Requires the following GitHub Secrets configured as environment variables:
///   - AzureOpenAI__Endpoint
///   - AzureOpenAI__AiModels__TaskGeneration__DeploymentId
/// Run manually via the "Run Manual Tests" GitHub Actions workflow,
/// or locally with: dotnet test --filter "Category=Manual"
/// </summary>
public class AiTaskGenerateServiceTests
{
    private readonly DateTimeResolveService _dateTimeResolveService = new();
    private readonly AiTaskGenerateService _aiTaskGenerateService;
    private readonly TimeZoneInfo _timeZone = TimeZoneInfo.Utc;

    public AiTaskGenerateServiceTests()
    {
        var configuration = new ConfigurationBuilder()
            .AddEnvironmentVariables()
            .Build();

        var endpoint = configuration["AzureOpenAI__Endpoint"]
            ?? throw new InvalidOperationException(
                "Missing env var: AzureOpenAI__Endpoint");

        var projectClient = new AIProjectClient(new Uri(endpoint), new DefaultAzureCredential());

        _aiTaskGenerateService = new AiTaskGenerateService(
            NullLogger<AiTaskGenerateService>.Instance,
            projectClient,
            configuration);
    }

    [Trait("Category", "Manual")]
    [Fact]
    public async Task GenerateAiResponse_WhenUserSaysTomorrowAt8Am_ShouldReturnTaskStartingTomorrowAt8Am()
    {
        // Arrange
        var userLocalTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _timeZone);
        var expectedDate = userLocalTime.Date.AddDays(1);
        var expectedStartTime = expectedDate.AddHours(8);

        const string userInput = "tomorrow go to school at 8am";

        var resolvedMessage = _dateTimeResolveService.Resolve(new ResolveDateTimesRequest
        {
            Message = userInput,
            TimeZone = _timeZone
        });

        var context = await _aiTaskGenerateService.InitializeAsync(
            preferredLanguage: "English",
            userLocalTime: userLocalTime,
            timeZone: _timeZone,
            ct: CancellationToken.None);

        // Act
        var result = await _aiTaskGenerateService.GenerateAiResponse(
            resolvedMessage, context, CancellationToken.None);

        // Assert
        result.IsSuccess.Should().BeTrue("AI should have extracted at least one task");
        result.ExtractedTasks.Should().NotBeEmpty("input contains a schedulable task");

        var task = result.ExtractedTasks[0];
        task.StartTime.Date.Should().Be(expectedStartTime.Date,
            "task is scheduled for tomorrow ({0})", expectedStartTime.Date.ToShortDateString());
        task.StartTime.Hour.Should().Be(8, "user specified 8am");
        task.StartTime.Minute.Should().Be(0);
    }
}
