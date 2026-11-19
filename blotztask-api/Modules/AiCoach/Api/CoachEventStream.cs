using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http.Features;

namespace BlotzTask.Modules.AiCoach.Api;

/// <summary>
/// One serialized response writer for business events and keep-alive comments. Writing is best-effort:
/// after the client disconnects every send is a no-op, so the turn itself is never failed by the stream.
/// </summary>
internal sealed class CoachEventStream(HttpResponse response, Guid conversationId, Guid turnId,
    JsonSerializerOptions json, CancellationToken ct) : IAsyncDisposable
{
    private readonly SemaphoreSlim gate = new(1);
    private readonly CancellationTokenSource lifetime = CancellationTokenSource.CreateLinkedTokenSource(ct);
    private Task? heartbeat;
    private int sequence;
    private bool disconnected;

    private bool Disconnected => disconnected || ct.IsCancellationRequested;

    public async Task SendAsync(string type, object payload)
    {
        if (Disconnected) return;
        await gate.WaitAsync(CancellationToken.None);
        try
        {
            if (Disconnected) return;
            var node = JsonSerializer.SerializeToNode(payload, json)!;
            ReviewListProtocolFilter.Project(node, true);
            if (type == "turn.started" && node["conversationId"] is { } id) conversationId = id.GetValue<Guid>();
            if (!response.HasStarted)
            {
                response.ContentType = "text/event-stream";
                response.Headers.CacheControl = "no-cache, no-store";
                response.Headers["X-Accel-Buffering"] = "no";
                response.HttpContext.Features.Get<IHttpResponseBodyFeature>()?.DisableBuffering();
            }
            var data = JsonSerializer.Serialize(new { conversationId, turnId, sequence = ++sequence, type, payload = node }, json);
            await response.WriteAsync($"event: {type}\ndata: {data}\n\n", ct);
            await response.Body.FlushAsync(ct);
            heartbeat ??= KeepAliveAsync();
        }
        catch (Exception error) when (error is OperationCanceledException or IOException)
        {
            MarkDisconnected();
        }
        finally { gate.Release(); }
    }

    private void MarkDisconnected()
    {
        disconnected = true;
        lifetime.Cancel();
    }

    private async Task KeepAliveAsync()
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(15));
        try
        {
            while (await timer.WaitForNextTickAsync(lifetime.Token))
            {
                await gate.WaitAsync(lifetime.Token);
                try
                {
                    await response.WriteAsync(": keep-alive\n\n", lifetime.Token);
                    await response.Body.FlushAsync(lifetime.Token);
                }
                finally { gate.Release(); }
            }
        }
        catch (Exception error) when (error is OperationCanceledException or IOException)
        {
            // A disconnected consumer must not leave a heartbeat running.
            disconnected = true;
        }
    }

    public async ValueTask DisposeAsync()
    {
        await lifetime.CancelAsync();
        if (heartbeat is not null) await heartbeat;
        lifetime.Dispose();
        gate.Dispose();
    }
}
