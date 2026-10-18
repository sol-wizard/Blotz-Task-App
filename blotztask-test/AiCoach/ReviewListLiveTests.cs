using Azure;
using Azure.AI.OpenAI;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit.Abstractions;

namespace BlotzTask.Tests.AiCoach;

/// <summary>Small real-model checks of capture intent; not an estimate of production precision.</summary>
public sealed class ReviewListLiveTests(ITestOutputHelper output)
{
    [CoachLiveTheory]
    [InlineData("帮我记到随手记：论文要求使用 APA 第七版。", 0, 1)]
    [InlineData("明天下午三点到五点写论文，帮我建任务。再把这句话记到随手记：论文要求使用 APA 第七版。", 1, 1)]
    [InlineData("APA 格式是什么？请简短解释。", 0, 0)]
    [InlineData("我最近很焦虑，论文要求用 APA 格式。我只想聊聊，请听我说，不用建议。", 0, 0)]
    public async Task Handle_RecordIntent_CapturesOnlyRequestedKinds(string message, int tasks, int notes)
    {
        // Arrange
        var credentials = CoachLiveSettings.Load() ?? throw new InvalidOperationException("Live credentials missing.");
        var limits = Options.Create(new AiCoachModuleOptions { DeploymentId = credentials.Deployment });
        var runtime = new ModelTurnRuntime(new AzureOpenAiModelGateway(
            new AzureOpenAIClient(new Uri(credentials.Endpoint), new AzureKeyCredential(credentials.Key)), limits),
            limits, NullLogger<ModelTurnRuntime>.Instance,
            new ModelContextBuilder(limits, NullLogger<ModelContextBuilder>.Instance));
        var request = new ModelTurnRequest(Guid.NewGuid(), AiCoachMode.Unified,
            [new GatewayUserMessage(message)], [], "Australia/Perth",
            new DateTimeOffset(2026, 10, 18, 9, 0, 0, TimeSpan.FromHours(8)), null, 0, ReviewListEnabled: true);
        // Act
        var result = await runtime.ExecuteAsync(request, default);
        output.WriteLine($"Deployment={credentials.Deployment}; error={result.Error}; tokens={result.TotalTokens}; reply={result.Text}");
        // Assert
        result.Error.Should().BeNull(because: "the real deployment must accept the mixed-list tool contract");
        result.Text.Should().NotBeNullOrWhiteSpace(because: "each capture or conversation still needs a visible reply");
        var items = result.Drafts.Where(draft => draft.Status == ProposalSetStatus.Pending).SelectMany(draft => draft.Proposals).ToArray();
        items.Count(item => item.Kind == ProposalKind.Task).Should().Be(tasks,
            because: "only requested task actions belong in the review list");
        items.Count(item => item.Kind == ProposalKind.Note).Should().Be(notes,
            because: "ordinary questions and sharing do not authorize note capture");
        items.Should().OnlyContain(item => !item.IsSaved, because: "model tools cannot save formal entities");
    }
}
