using System.Text.Json;
using Azure;
using Azure.AI.OpenAI;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Xunit.Abstractions;

namespace BlotzTask.Tests.AiCoach;

/// <summary>Opt-in real deployment checks; no scripted model or strategy assertions.</summary>
public sealed class CoachLiveTests(ITestOutputHelper output) : IDisposable
{
    private readonly ILoggerFactory _logs = LoggerFactory.Create(builder => builder.AddConsole());
    public void Dispose() => _logs.Dispose();
    [CoachLiveTheory]
    [InlineData(AiCoachMode.Execution)]
    [InlineData(AiCoachMode.Clarify)]
    [InlineData(AiCoachMode.Companion)]
    public async Task Handle_OrdinaryConversation_ReturnsNaturalText(AiCoachMode mode)
    {
        // Arrange
        var runtime = Runtime();
        var request = Request(mode, [new GatewayUserMessage("我只是想聊聊。我今天终于有空休息一下了。")]);
        // Act
        var result = await runtime.ExecuteAsync(request, default);
        output.WriteLine($"{mode}: {result.Text}; error={result.Error}; tokens={result.TotalTokens}");
        // Assert
        result.Error.Should().BeNull(because: "normal conversation has no evidence or response-type protocol to satisfy");
        result.Text.Should().NotBeNullOrWhiteSpace(because: "the user should receive a substantive natural reply");
        result.Drafts.Should().BeEmpty(because: "the user explicitly wants conversation");
    }

    [CoachLiveFact]
    public async Task Handle_CreateThenCorrectDraft_UsesToolsAndRetainsStableItem()
    {
        // Arrange
        var runtime = Runtime();
        var history = new List<GatewayMessage> { new GatewayUserMessage("请创建一个草稿：明天早上9点到9点半阅读第一章。") };
        // Act
        var created = await runtime.ExecuteAsync(Request(AiCoachMode.Execution, history), default);
        created.Error.Should().BeNull(because: "the real model must be able to call the registered draft tools");
        created.Drafts.Should().ContainSingle(because: "the user requested one draft");
        history.AddRange(created.TurnHistory);
        history.Add(new GatewayUserMessage("把刚才这张草稿的阅读时间改到后天，其他内容不变。"));
        var updated = await runtime.ExecuteAsync(Request(AiCoachMode.Execution, history) with { Drafts = created.Drafts }, default);
        output.WriteLine($"Created: {created.Text}\nUpdated: {updated.Text}; error={updated.Error}");
        // Assert
        updated.Error.Should().BeNull(because: "historical references should work without current-turn quotes");
        updated.Drafts.Should().ContainSingle(because: "a correction should update the existing card");
        updated.Drafts[0].Proposals[0].ProposalId.Should().Be(created.Drafts[0].Proposals[0].ProposalId,
            because: "editing must preserve the task's identity");
        updated.Drafts[0].Proposals[0].Date.Should().Be(new DateOnly(2026, 10, 3), because: "all tool calls use the same fixed local date");
        updated.Drafts[0].Proposals[0].PersistedTaskId.Should().BeNull(because: "draft tools cannot write formal tasks");
    }

    [CoachLiveFact]
    public async Task Handle_LongHistory_SummarizesWithoutLosingEarlierPreference()
    {
        // Arrange
        // Keep enough room for the current prompt/tools; history itself forces compression.
        var runtime = Runtime();
        var history = new List<GatewayMessage> { new GatewayUserMessage("这次对话里，我给计划起的代号是蓝鲸。请记住。"),
            new GatewayAssistantMessage("好的，计划代号是蓝鲸。", []) };
        for (var index = 0; index < 32; index++)
        {
            history.Add(new GatewayUserMessage($"第{index}次讨论：" + string.Concat(Enumerable.Repeat("今天讨论怎样安排阅读和休息，时间还没有决定。", 8))));
            history.Add(new GatewayAssistantMessage("我们可以继续梳理你的想法。", []));
        }
        history.Add(new GatewayUserMessage("我们最开始给计划取的代号是什么？只告诉我代号。"));
        // Act
        var result = await runtime.ExecuteAsync(Request(AiCoachMode.Clarify, history), default);
        output.WriteLine($"Summary covered {result.SummarizedMessageCount}; summary={result.Summary}; response={result.Text}; error={result.Error}");
        // Assert
        result.Error.Should().BeNull(because: "long conversations should compress context instead of silently dropping it");
        result.SummarizedMessageCount.Should().BeGreaterThan(0, because: "the transcript exceeds this context budget");
        result.Text.Should().Contain("蓝鲸", because: "earlier user context must survive summary compression");
    }

    private ModelTurnRuntime Runtime(AiCoachModuleOptions? limits = null)
    {
        var credentials = CoachLiveSettings.Load() ?? throw new InvalidOperationException("Live credentials missing.");
        limits ??= new AiCoachModuleOptions();
        limits.DeploymentId = credentials.Deployment;
        return new(new AzureOpenAiModelGateway(new AzureOpenAIClient(new Uri(credentials.Endpoint),
            new AzureKeyCredential(credentials.Key)), Options.Create(limits)), Options.Create(limits), _logs.CreateLogger<ModelTurnRuntime>(), new ModelContextBuilder(Options.Create(limits), _logs.CreateLogger<ModelContextBuilder>()));
    }
    private static ModelTurnRequest Request(AiCoachMode mode, IReadOnlyList<GatewayMessage> history) =>
        new(Guid.NewGuid(), mode, history, [], "Australia/Perth", new DateTimeOffset(2026, 10, 1, 8, 0, 0, TimeSpan.FromHours(8)), null, 0);
}

public sealed class CoachLiveFactAttribute : FactAttribute
{
    public CoachLiveFactAttribute() { Skip = CoachLiveSettings.SkipReason; }
}
public sealed class CoachLiveTheoryAttribute : TheoryAttribute
{
    public CoachLiveTheoryAttribute() { Skip = CoachLiveSettings.SkipReason; }
}
internal static class CoachLiveSettings
{
    public static string? SkipReason => Environment.GetEnvironmentVariable("AICOACH_MODEL_TESTS") != "1"
        ? "Set AICOACH_MODEL_TESTS=1 to call the real model deployment."
        : Load() is null ? "Azure deployment credentials are not configured." : null;

    public static (string Endpoint, string Key, string Deployment)? Load()
    {
        for (var dir = new DirectoryInfo(AppContext.BaseDirectory); dir is not null; dir = dir.Parent)
        {
            var path = Path.Combine(dir.FullName, "blotztask-api", "appsettings.Development.json");
            if (!File.Exists(path)) continue;
            using var json = JsonDocument.Parse(File.ReadAllText(path));
            if (!json.RootElement.TryGetProperty("AzureOpenAI", out var azure)) return null;
            var endpoint = azure.TryGetProperty("Endpoint", out var e) ? e.GetString() : null;
            var key = azure.TryGetProperty("ApiKey", out var k) ? k.GetString() : null;
            var deployment = azure.TryGetProperty("AiModels", out var models) && models.TryGetProperty("TaskGeneration", out var task)
                && task.TryGetProperty("DeploymentId", out var d) ? d.GetString() : null;
            return string.IsNullOrWhiteSpace(endpoint) || string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(deployment)
                ? null : (endpoint, key, deployment);
        }
        return null;
    }
}
