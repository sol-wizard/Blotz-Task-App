using Microsoft.AspNetCore.SignalR.Client;
using System.Text.Json;
using System.Threading;

// Single‑purpose console to test BreakdownTask and ModifyBreakdown hub methods.
// Reads HubUrl and TaskDefaults from appsettings.json and lets you send the BreakdownTask payload quickly.

class Program
{
    private static TaskCompletionSource<bool>? _pendingResponse;

    static async Task Main(string[] args)
    {
        // Load config (no extra config packages needed)
        if (!File.Exists("appsettings.json"))
        {
            Console.WriteLine("appsettings.json not found.");
            return;
        }

        using var doc = JsonDocument.Parse(File.ReadAllText("appsettings.json"));
        var root = doc.RootElement;
        var hubUrl = root.TryGetProperty("HubUrl", out var hubEl) ? hubEl.GetString() : null;
        if (string.IsNullOrWhiteSpace(hubUrl))
        {
            Console.WriteLine("HubUrl missing in appsettings.json");
            return;
        }
        var taskDefaults = root.TryGetProperty("TaskDefaults", out var tdEl) ? tdEl : default;
        var defTitle = taskDefaults.ValueKind == JsonValueKind.Object && taskDefaults.TryGetProperty("Title", out var tEl) ? tEl.GetString() ?? "Demo Task" : "Demo Task";
        var defDesc = taskDefaults.ValueKind == JsonValueKind.Object && taskDefaults.TryGetProperty("Description", out var dEl) ? dEl.GetString() ?? "Break me down" : "Break me down";
        var modifyRequest = root.TryGetProperty("ModifyRequest", out var mrEl) ? mrEl.GetString() ?? "Please refine subtask." : "Please refine subtask.";

        var connection = new HubConnectionBuilder()
            .WithUrl(hubUrl)
            .WithAutomaticReconnect()
            .Build();

        // Server -> client handlers (only ones needed for breakdown testing)
        connection.On<bool>("BotTyping", isTyping =>
        {
            Console.WriteLine($"[BotTyping] {isTyping}");
        });
        connection.On<JsonElement>("ReceiveSubtasks", json =>
        {
            Console.WriteLine("================ Hub Response ================");
            Console.WriteLine("[ReceiveBreakdown]");
            Console.WriteLine(JsonSerializer.Serialize(json, new JsonSerializerOptions { WriteIndented = true }));
            Console.WriteLine("==============================================");
            _pendingResponse?.TrySetResult(true);
        });

        connection.Closed += async err =>
        {
            Console.WriteLine($"Connection closed: {err?.Message}");
            await Task.Delay(1500);
            try { await connection.StartAsync(); Console.WriteLine("Reconnected"); } catch { }
        };

        try
        {
            Console.WriteLine($"Connecting to {hubUrl} ...");
            await connection.StartAsync();
            Console.WriteLine("Connected.\n");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to connect: {ex.Message}");
            return;
        }

        // Immediate send option (auto or prompt)
        while (true)
        {
            Console.WriteLine("Menu:");
            Console.WriteLine("  1) Send BreakdownTask (defaults from appsettings.json)");
            Console.WriteLine("  2) ModifyBreakdown (default request)");
            Console.WriteLine("  x) Exit");
            Console.Write("> ");
            var choice = Console.ReadLine()?.Trim().ToLowerInvariant();
            if (choice is "x" or "q" or "exit") break;

            try
            {
                switch (choice)
                {
                    case "1":
                        _pendingResponse = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                        await HubActions.SendBreakdown(connection, defTitle, defDesc);
                        await _pendingResponse.Task; // wait for ReceiveBreakdown
                        break;
                    case "2":
                        _pendingResponse = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                        await HubActions.SendModifyBreakdown(connection, modifyRequest);
                        await _pendingResponse.Task; // wait for ReceiveBreakdown
                        break;
                    default:
                        Console.WriteLine("Unknown option");
                        break;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Invoke error: {ex.Message}");
                _pendingResponse?.TrySetCanceled();
            }
        }

        await connection.DisposeAsync();
    }
}
