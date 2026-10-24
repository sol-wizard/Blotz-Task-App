using Azure;
using Azure.AI.OpenAI;
using BlotzTask.Extension.Options;
using BlotzTask.Modules.AiCoach;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Modules.AiCoach.Infrastructure;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit.Abstractions;

namespace BlotzTask.Tests.AiCoach;

public sealed class ModelSwitchingLiveTests(ITestOutputHelper output)
{
    [CoachLiveTheory]
    [InlineData("luna", "I just want to chat. I finally have a quiet afternoon to rest. No tasks or notes, please.")]
    [InlineData("sol", "I just want to chat. I finally have a quiet afternoon to rest. No tasks or notes, please.")]
    [InlineData("luna", "我只是想聊聊，今天终于有空休息一下了。不要创建任务或笔记。")]
    [InlineData("sol", "我只是想聊聊，今天终于有空休息一下了。不要创建任务或笔记。")]
    public async Task Handle_OrdinaryConversation_ReturnsStreamedTextWithoutDrafts(string model, string message)
    {
        // Arrange
        using var provider = Provider(model);
        var deltas = new List<string>();
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(90));
        var request = new ModelTurnRequest(Guid.NewGuid(), [new GatewayUserMessage(message)], [], "Australia/Perth",
            DateTimeOffset.UtcNow, null, 0, ReviewListEnabled: true, Stream: (kind, payload) =>
            {
                if (kind == "reply.delta") deltas.Add(System.Text.Json.JsonSerializer.Serialize(payload));
                return Task.CompletedTask;
            });

        // Act
        var result = await Runtime(provider).ExecuteAsync(request, timeout.Token);

        // Assert
        result.Error.Should().BeNull(because: "both model profiles must support ordinary conversation through the actual runtime");
        result.Text.Should().NotBeNullOrWhiteSpace(because: "the user must receive a natural reply");
        result.Drafts.Should().BeEmpty(because: "conversation alone does not authorize draft creation");
        deltas.Should().NotBeEmpty(because: "the mobile app depends on streamed text events");
        result.Model!.Name.Should().Be(model, because: "usage and traces must identify the actual profile");
        output.WriteLine($"{model}: ordinary conversation, streamed deltas={deltas.Count}, tokens={result.TotalTokens}");
    }

    [CoachLiveTheory]
    [InlineData("luna")]
    [InlineData("sol")]
    public async Task Handle_ModelSelection_CompletesConcurrentStreamingToolRoundTrips(string model)
    {
        // Arrange
        using var provider = Provider(model);
        var gateway = provider.GetRequiredService<IModelGateway>();
        var tool = new GatewayToolDefinition("connection_probe", "Check a connection.",
            """{"type":"object","properties":{"value":{"type":"string"}},"required":["value"],"additionalProperties":false}""");
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(120));

        // Act
        var replies = await Task.WhenAll(RoundTrip("ALPHA"), RoundTrip("BRAVO"));

        // Assert
        replies.Should().Equal(["ALPHA", "BRAVO"], because: "concurrent turns must receive only their own tool results");

        async Task<string> RoundTrip(string marker)
        {
            var turn = gateway.OpenTurn();
            var deltas = new List<string>();
            var system = "Call connection_probe exactly once with the value requested by the user. " +
                "After receiving its result, reply with exactly the result string and nothing else.";
            var user = new GatewayUserMessage("Check the connection with value " + marker);
            var first = await turn.CompleteAsync(new(system, [user], [tool], 4096, _ => Task.CompletedTask), timeout.Token);
            first.ToolCalls.Should().ContainSingle(because: "the actual model must return a tool call through the selected transport");
            var call = first.ToolCalls.Single();
            call.Name.Should().Be(tool.Name, because: "streamed tool names must be reconstructed correctly");
            var final = await turn.CompleteAsync(new(system, [user,
                new GatewayAssistantMessage(first.AssistantText, first.ToolCalls),
                new GatewayToolResultMessage(call.Id, marker)], [tool], 4096,
                text => { deltas.Add(text); return Task.CompletedTask; }), timeout.Token);
            final.FinishReason.Should().Be(ModelFinishReason.Stop, because: "the tool loop must end with a complete reply");
            string.Concat(deltas).Should().Be(final.AssistantText, because: "the stream and final reply must agree");
            final.TotalTokens.Should().BeGreaterThan(0, because: "both transports must report real usage");
            output.WriteLine($"{model}: streamed tool roundtrip {marker}; tokens={first.TotalTokens + final.TotalTokens}");
            return final.AssistantText!;
        }
    }

    [CoachLiveTheory]
    [InlineData("luna", "sol")]
    [InlineData("sol", "luna")]
    public async Task Handle_SwitchBetweenTurns_CorrectsExistingDraft(string firstModel, string secondModel)
    {
        // Arrange
        using var firstProvider = Provider(firstModel);
        using var secondProvider = Provider(secondModel);
        var conversationId = Guid.NewGuid();
        var history = new List<GatewayMessage>
        {
            new GatewayUserMessage("创建一条任务草稿：2026年11月2日上午9点到9点半阅读第一章。不要保存。"),
        };
        ModelTurnRequest Request() => new(conversationId, history, [], "Australia/Perth",
            new DateTimeOffset(2026, 10, 24, 8, 0, 0, TimeSpan.FromHours(8)), null, 0,
            ReviewListEnabled: true, Stream: (_, _) => Task.CompletedTask);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(180));

        // Act
        var first = await Runtime(firstProvider).ExecuteAsync(Request(), timeout.Token);
        first.Error.Should().BeNull(because: "the first model must create a draft through real tools");
        first.Drafts.Should().ContainSingle(because: "the user requested one draft");
        history.AddRange(first.TurnHistory);
        history.Add(new GatewayUserMessage("把刚才那条阅读任务改到同一天上午10点到10点半，其他不变。不要保存。"));
        var second = await Runtime(secondProvider).ExecuteAsync(Request() with { Drafts = first.Drafts }, timeout.Token);

        // Assert
        second.Error.Should().BeNull(because: "tool history must remain valid after switching transports");
        second.Drafts.Should().ContainSingle(because: "a correction must retain the existing draft");
        var before = first.Drafts.Single().Proposals.Single();
        var after = second.Drafts.Single().Proposals.Single();
        after.ProposalId.Should().Be(before.ProposalId, because: "switching models must retain item identity");
        after.StartTime.Should().Be(new TimeOnly(10, 0), because: "the new model must execute the requested correction");
        after.EndTime.Should().Be(new TimeOnly(10, 30), because: "the corrected duration must remain thirty minutes");
        after.PersistedTaskId.Should().BeNull(because: "model switching must not bypass draft confirmation");
        second.Model!.Name.Should().Be(secondModel, because: "runtime evidence must identify the selected profile");
        output.WriteLine($"{firstModel} -> {secondModel}: draft identity retained; calls={first.ModelCallCount + second.ModelCallCount}");
    }

    private static ModelTurnRuntime Runtime(ServiceProvider services)
    {
        var options = services.GetRequiredService<IOptions<AiCoachModuleOptions>>();
        return new(services.GetRequiredService<IModelGateway>(), options, NullLogger<ModelTurnRuntime>.Instance,
            new ModelContextBuilder(options, NullLogger<ModelContextBuilder>.Instance));
    }

    private static ServiceProvider Provider(string model)
    {
        var credentials = CoachLiveSettings.Load() ?? throw new InvalidOperationException("Live credentials missing.");
        var root = Evaluation.CoachEvaluationHarness.FindRepository();
        var config = new ConfigurationBuilder().AddJsonFile(Path.Combine(root, "blotztask-api", "appsettings.json"))
            .AddInMemoryCollection(new Dictionary<string, string?> { ["AiCoach:DefaultModel"] = model }).Build();
        var services = new ServiceCollection();
        services.AddSingleton<IConfiguration>(config);
        services.Configure<AzureOpenAIOptions>(azure => { azure.Endpoint = credentials.Endpoint; azure.ApiKey = credentials.Key; });
        services.AddSingleton(new AzureOpenAIClient(new Uri(credentials.Endpoint), new AzureKeyCredential(credentials.Key)));
        services.AddAiCoachModule();
        return services.BuildServiceProvider();
    }
}
