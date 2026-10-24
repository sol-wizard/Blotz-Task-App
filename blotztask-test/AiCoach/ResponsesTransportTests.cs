using System.Net;
using System.Text.Json;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace BlotzTask.Tests.AiCoach;

/// <summary>Protocol fixtures over a real loopback HTTP connection; no Azure credentials required.</summary>
public sealed class ResponsesTransportTests
{
    [Fact]
    public async Task Handle_ReusedProviderCallId_KeepsContinuationIsolatedBetweenTurns()
    {
        // Arrange
        var continuations = new List<(string User, string Reasoning)>();
        await using var server = await Server(async context =>
        {
            using var document = await JsonDocument.ParseAsync(context.Request.Body);
            var input = document.RootElement.GetProperty("input");
            var user = input[0].GetProperty("content").GetString()!;
            if (input.GetArrayLength() == 1)
                await context.Response.WriteAsync(Completion("[{\"type\":\"reasoning\",\"id\":\"rs_same\",\"encrypted_content\":\""
                    + user + "\",\"summary\":[]},{\"type\":\"function_call\",\"id\":\"fc_same\",\"call_id\":\"call_same\",\"name\":\"probe\",\"arguments\":\"{}\"}]"));
            else
            {
                continuations.Add((user, input[1].GetProperty("encrypted_content").GetString()!));
                await context.Response.WriteAsync(Completion("[]"));
            }
        });
        using var client = new HttpClient();
        var root = Gateway(client, server);
        var first = root.OpenTurn();
        var second = root.OpenTurn();

        // Act
        var alpha = await first.CompleteAsync(new("Check", [new GatewayUserMessage("alpha")], []), default);
        var bravo = await second.CompleteAsync(new("Check", [new GatewayUserMessage("bravo")], []), default);
        await first.CompleteAsync(new("Check", [new GatewayUserMessage("alpha"),
            new GatewayAssistantMessage(null, alpha.ToolCalls), new GatewayToolResultMessage("call_same", "ok")], []), default);
        await second.CompleteAsync(new("Check", [new GatewayUserMessage("bravo"),
            new GatewayAssistantMessage(null, bravo.ToolCalls), new GatewayToolResultMessage("call_same", "ok")], []), default);

        // Assert
        continuations.Should().Equal([("alpha", "alpha"), ("bravo", "bravo")],
            because: "even identical provider call IDs must not let one turn overwrite another turn's reasoning");
    }

    [Fact]
    public async Task Handle_StreamedToolCall_ReplaysReasoningAndReturnsFinalUsage()
    {
        // Arrange
        var requests = new List<JsonElement>();
        await using var server = await Server(async context =>
        {
            using var input = await JsonDocument.ParseAsync(context.Request.Body);
            requests.Add(input.RootElement.Clone());
            context.Response.ContentType = "text/event-stream";
            if (requests.Count == 1)
            {
                await context.Response.WriteAsync("event: response.function_call_arguments.delta\ndata: {\"type\":\"response.function_call_arguments.delta\",\"delta\":\"{\\\"value\\\":\"}\n\n");
                await context.Response.Body.FlushAsync();
                await context.Response.WriteAsync("data: {\"type\":\"response.completed\",\"response\":" + Completion(
                    """[{"type":"reasoning","id":"rs_1","encrypted_content":"opaque-reasoning","summary":[]},{"type":"function_call","id":"fc_1","call_id":"call_1","name":"probe","arguments":"{\"value\":\"ok\"}","status":"completed"}]""") + "}\n\n");
            }
            else
            {
                await context.Response.WriteAsync("data: {\"type\":\"response.output_text.delta\",\"delta\":\"O\"}\n\n");
                await context.Response.Body.FlushAsync();
                await context.Response.WriteAsync("data: {\"type\":\"response.output_text.delta\",\"delta\":\"K\"}\n\n");
                await context.Response.WriteAsync("data: {\"type\":\"response.completed\",\"response\":" + Completion(
                    """[{"type":"message","role":"assistant","content":[{"type":"output_text","text":"OK"}]}]""") + "}\n\n");
            }
        });
        using var client = new HttpClient();
        var gateway = Gateway(client, server);
        var user = new GatewayUserMessage("Check");
        var deltas = new List<string>();

        // Act
        var first = await gateway.CompleteAsync(new("Check", [user], [], OnTextDelta: _ => Task.CompletedTask), default);
        var final = await gateway.CompleteAsync(new("Check", [user,
            new GatewayAssistantMessage(null, first.ToolCalls), new GatewayToolResultMessage("call_1", "ok")], [],
            OnTextDelta: text => { deltas.Add(text); return Task.CompletedTask; }), default);

        // Assert
        first.ToolCalls.Single().ArgumentsJson.Should().Be("{\"value\":\"ok\"}", because: "the completed snapshot contains the assembled tool arguments");
        requests[1].GetProperty("input")[1].GetProperty("encrypted_content").GetString().Should().Be("opaque-reasoning",
            because: "tool results must retain the provider reasoning context in the same turn");
        requests[1].GetProperty("input")[2].GetProperty("id").GetString().Should().Be("fc_1",
            because: "provider function IDs must survive continuation");
        requests[1].GetProperty("store").GetBoolean().Should().BeFalse(because: "the app owns durable conversation history");
        string.Concat(deltas).Should().Be("OK", because: "text deltas must be delivered as they arrive");
        final.AssistantText.Should().Be("OK", because: "the terminal response supplies the authoritative complete text");
        final.CachedInputTokens.Should().Be(5, because: "cache usage must be retained for cost estimates");
        final.TotalTokens.Should().Be(12, because: "streamed usage comes from the terminal response");
    }

    [Theory]
    [InlineData("max_output_tokens", ModelFinishReason.Length)]
    [InlineData("content_filter", ModelFinishReason.ContentFilter)]
    [InlineData("other", ModelFinishReason.Other)]
    public async Task Handle_IncompleteResponse_PreservesFailureReason(string reason, ModelFinishReason expected)
    {
        // Arrange
        await using var server = await Server(context => context.Response.WriteAsync(
            "{\"status\":\"incomplete\",\"output\":[],\"incomplete_details\":{\"reason\":\"" + reason + "\"}}"));
        using var client = new HttpClient();

        // Act
        var result = await Gateway(client, server).CompleteAsync(new("Check", [], []), default);

        // Assert
        result.FinishReason.Should().Be(expected, because: "an interrupted response must not appear successful");
    }

    [Fact]
    public async Task Handle_TruncatedStream_RejectsMissingTerminalResponse()
    {
        // Arrange
        await using var server = await Server(context => context.Response.WriteAsync(
            "data: {\"type\":\"response.output_text.delta\",\"delta\":\"partial\"}\n\n"));
        using var client = new HttpClient();

        // Act
        var run = () => Gateway(client, server).CompleteAsync(new("Check", [], [], OnTextDelta: _ => Task.CompletedTask), default);

        // Assert
        await run.Should().ThrowAsync<IOException>(because: "partial text without completion must not be committed as a successful turn");
    }

    [Fact]
    public async Task Handle_AuthorizationFailure_PreservesStatusWithoutEchoingProviderBody()
    {
        // Arrange
        await using var server = await Server(async context =>
        {
            context.Response.StatusCode = 401;
            await context.Response.WriteAsync("private echoed provider body");
        });
        using var client = new HttpClient();

        // Act
        var run = () => Gateway(client, server).CompleteAsync(new("Check", [], []), default);

        // Assert
        var thrown = await run.Should().ThrowAsync<HttpRequestException>(because: "the runtime must distinguish invalid credentials");
        thrown.Which.StatusCode.Should().Be(HttpStatusCode.Unauthorized, because: "authorization failures map to configuration_error");
        thrown.Which.Message.Should().NotContain("private", because: "provider bodies may contain user content");
    }

    [Fact]
    public async Task Handle_CancelledRequest_PropagatesCancellation()
    {
        // Arrange
        await using var server = await Server(context => context.Response.WriteAsync(Completion("[]")));
        using var client = new HttpClient();
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();

        // Act
        var run = () => Gateway(client, server).CompleteAsync(new("Check", [], []), cancellation.Token);

        // Assert
        await run.Should().ThrowAsync<OperationCanceledException>(because: "user cancellation must stop network work");
    }

    private static AzureResponsesModelGateway Gateway(HttpClient client, WebApplication server) => new(client,
        server.Urls.Single(), "protocol-fixture", new("sol", "gpt-6.1-sol", "Responses", "medium", 4096, 60, null, null, null));

    private static string Completion(string output) => "{\"status\":\"completed\",\"output\":" + output
        + ",\"usage\":{\"input_tokens\":10,\"output_tokens\":2,\"total_tokens\":12,\"input_tokens_details\":{\"cached_tokens\":5}}}";

    private static async Task<WebApplication> Server(RequestDelegate handle)
    {
        var builder = WebApplication.CreateSlimBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        var app = builder.Build();
        app.MapPost("/openai/v1/responses", handle);
        await app.StartAsync();
        return app;
    }
}
