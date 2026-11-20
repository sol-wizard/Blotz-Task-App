using BlotzTask.Extension.Options;
using BlotzTask.Modules.AiUsage.Exceptions;
using BlotzTask.Modules.AiUsage.Services;
using BlotzTask.Modules.ChatTaskGenerator;
using BlotzTask.Modules.ChatTaskGenerator.Functions;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.Services;

/// <summary>
/// Quota is checked before any AI call, so a stub quota service is enough to prove
/// AiQuotaExceededException is not wrapped as Unknown (PBI 1673).
/// </summary>
public class AiChatServiceQuotaTests
{
    [Fact]
    public async Task GenerateAiResponse_QuotaExceeded_ThrowsAiQuotaExceededExceptionNotUnknown()
    {
        // Arrange
        var options = Options.Create(new AzureOpenAIOptions
        {
            AiModels = new AiModelsOptions
            {
                TaskGeneration = new ModelDeploymentOptions { DeploymentId = "test-deployment" }
            }
        });
        var service = new AiChatService(
            TestDbContextFactory.CreateLogger<AiChatService>(),
            projectClient: null!,
            options,
            new ThrowingQuotaService(),
            recordAiUsageService: null!);
        var context = new AiChatContext
        {
            Agent = null!,
            Session = null!,
            Tools = new TaskGenerationTools(),
            TimeZone = TimeZoneInfo.Utc
        };

        // Act
        var act = () => service.GenerateAiResponse(
            Guid.NewGuid(),
            "hello",
            "hello",
            context,
            CancellationToken.None);

        // Assert
        await act.Should().ThrowAsync<AiQuotaExceededException>(
            because: "quota must reach AiHubFilter as QuotaExceeded, not be wrapped as Unknown");
    }

    private sealed class ThrowingQuotaService : ICheckAiQuotaService
    {
        public Task CheckQuotaAsync(Guid userId, CancellationToken ct = default)
            => throw new AiQuotaExceededException();
    }
}
