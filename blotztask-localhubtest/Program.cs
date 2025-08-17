using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.Configuration;
using System.Text.Json;

class Program
{
    static async Task Main(string[] args)
    {
        var config = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
            .Build();
        var hubUrl = config["SignalR:HubUrl"];
        if (string.IsNullOrEmpty(hubUrl))
        {
            Console.WriteLine("❌ No hub URL configured in appsettings.json. Exiting.");
            return;
        }

        var connection = new HubConnectionBuilder()
            .WithUrl(hubUrl)
            .WithAutomaticReconnect()
            .Build();

        // Generic catch-all for any hub method the server invokes
        connection.On<string, object>("*", (target, payload) =>
        {
            Console.WriteLine($"📩 Received from server: [{target}] {JsonSerializer.Serialize(payload)}");
        });

        connection.Closed += async (error) =>
        {
            Console.WriteLine($"❌ Connection closed: {error?.Message}");
            await Task.Delay(3000);
            try
            {
                await connection.StartAsync();
                Console.WriteLine("🔄 Reconnected");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Reconnect failed: {ex.Message}");
            }
        };

        try
        {
            Console.WriteLine($"Connecting to {hubUrl} ...");
            await connection.StartAsync();
            Console.WriteLine("✅ Connected to hub");

            while (true)
            {
                Console.WriteLine("\nEnter command (or 'exit' to quit):");
                Console.WriteLine("Format: MethodName { \"arg1\":\"value\", \"arg2\":123 }");
                var input = Console.ReadLine();

                if (string.IsNullOrWhiteSpace(input) || input.Equals("exit", StringComparison.OrdinalIgnoreCase))
                    break;

                try
                {
                    var parts = input.Split(' ', 2);
                    var method = parts[0];
                    object[] argsArray = Array.Empty<object>();

                    if (parts.Length > 1)
                    {
                        var json = parts[1];
                        try
                        {
                            // Parse single object or array of objects
                            if (json.TrimStart().StartsWith("["))
                                argsArray = JsonSerializer.Deserialize<object[]>(json) ?? Array.Empty<object>();
                            else
                                argsArray = new object[] { JsonSerializer.Deserialize<object>(json)! };
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"⚠️ Invalid JSON args: {ex.Message}");
                        }
                    }

                    await connection.InvokeAsync(method, argsArray);
                    Console.WriteLine($"✅ Invoked '{method}' with args {JsonSerializer.Serialize(argsArray)}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Error invoking hub: {ex.Message}");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Connection failed: {ex.Message}");
        }
    }
}
