using Microsoft.AspNetCore.SignalR.Client;
using System.Text.Json;

// Encapsulates hub invocation helper methods.
public static class HubActions
{
    private static readonly JsonSerializerOptions Pretty = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    public static async Task SendBreakdown(HubConnection conn, string title, string desc)
    {
        var dto = new TaskDetailsDto(title, desc);
        Console.WriteLine("🚀 Sending BreakdownTask → hub");
        Console.WriteLine($"   📤 Payload DTO: {JsonSerializer.Serialize(dto, Pretty)}");
        await conn.InvokeAsync("BreakdownTask", dto);
        Console.WriteLine("✅ BreakdownTask invoked (awaiting BotTyping / ReceiveBreakdown)\n");
    }

    public static async Task SendModifyBreakdown(HubConnection conn, string userRequest)
    {
        Console.WriteLine("✏️  Sending ModifyBreakdown → hub");
        Console.WriteLine($"   🗒️  UserRequest: {userRequest}");
        await conn.InvokeAsync("ModifyBreakdown", userRequest);
        Console.WriteLine("✅ ModifyBreakdown invoked (awaiting BotTyping / ReceiveBreakdown)\n");
    }
}
