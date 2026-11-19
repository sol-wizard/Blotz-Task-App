using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Runtime;
using BlotzTask.Tests.Fixtures;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace BlotzTask.Tests.AiCoach;

public sealed class TraceToolSetTests(DatabaseFixture fixture) : IClassFixture<DatabaseFixture>
{
    [Fact]
    public async Task Handle_RepeatedToolSet_StoresDefinitionsOnceAndTracesOnlyTheHash()
    {
        // Arrange
        await using var session = await ConversationSegmentTests.Session.CreateAsync(fixture);
        var gateway = new ScriptedGateway();
        var runtime = new ModelTurnRuntime(gateway, session.Options, NullLogger<ModelTurnRuntime>.Instance,
            new ModelContextBuilder(session.Options, NullLogger<ModelContextBuilder>.Instance));

        // Act: two turns, each reading tasks once and then replying, so four requests share one tool list.
        for (var turn = 0; turn < 2; turn++)
        {
            var turnId = Guid.NewGuid();
            var result = await runtime.ExecuteAsync(new ModelTurnRequest(session.Open.Id,
                [new GatewayUserMessage("What is on tomorrow?")], [], "Australia/Perth", session.Clock.Now, null, 0,
                ReadTasks: (_, _, _) => Task.FromResult("[]"),
                Trace: (kind, payload) => session.Trace.RecordAsync(session.UserId, session.Open.Id, turnId, kind, payload)),
                default);
            result.Error.Should().BeNull(because: "the scripted turn reads tasks and then replies");
        }

        // Assert
        var requests = await session.Db.AiCoachTraceEvents.AsNoTracking()
            .Where(trace => trace.ConversationId == session.Open.Id && trace.Kind == "model_request")
            .Select(trace => trace.Payload).ToListAsync();
        requests.Should().HaveCount(4, because: "each turn made two model calls");
        var hashes = requests.Select(payload =>
        {
            using var document = JsonDocument.Parse(payload);
            document.RootElement.TryGetProperty("Tools", out _).Should().BeFalse(
                because: "tool definitions are stored once instead of in every request trace");
            document.RootElement.GetProperty("toolNames").EnumerateArray().Select(name => name.GetString())
                .Should().Contain("list_tasks", because: "the trace still names the tools the model was offered");
            return document.RootElement.GetProperty("toolSetHash").GetString();
        }).Distinct().ToList();
        hashes.Should().ContainSingle(because: "every request offered the same tool list");
        var toolSets = await session.Db.AiCoachToolSets.AsNoTracking()
            .Where(set => set.Hash == hashes[0]).ToListAsync();
        toolSets.Should().ContainSingle(because: "the same tool list is saved only once across requests and turns");
        toolSets[0].Definitions.Should().Contain("list_tasks", because: "the saved row holds the full definitions");
    }

    private sealed class ScriptedGateway : IModelGateway
    {
        private int _calls;

        public Task<ModelCompletionResult> CompleteAsync(ModelGatewayRequest request, CancellationToken cancellationToken) =>
            Task.FromResult(_calls++ % 2 == 0
                ? new ModelCompletionResult(null,
                    [new ModelToolCallRequest($"call-{_calls}", "list_tasks", """{"startDate":"2026-10-17","endDate":"2026-10-17"}""")],
                    ModelFinishReason.ToolCalls, 10, 10, 20)
                : new ModelCompletionResult("Nothing is planned tomorrow.", [], ModelFinishReason.Stop, 10, 10, 20));
    }
}
