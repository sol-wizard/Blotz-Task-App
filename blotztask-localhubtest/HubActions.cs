using Microsoft.AspNetCore.SignalR.Client;
using System.Text.Json;

// Encapsulates hub invocation helper methods.
public static class HubActions
{
    private static readonly JsonSerializerOptions Pretty = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    public static async Task SendBreakdown(HubConnection conn, string title, string desc, string convId)
    {
        var dto = new TaskDetailsDto(title, desc);
        Console.WriteLine("🚀 Sending BreakdownTask → hub");
        Console.WriteLine($"   📤 Payload DTO: {JsonSerializer.Serialize(dto, Pretty)}");
        Console.WriteLine($"   🧵 ConversationId: {convId}");
        await conn.InvokeAsync("BreakdownTask", dto, convId);
        Console.WriteLine("✅ BreakdownTask invoked (awaiting BotTyping / ReceiveBreakdown)\n");
    }

    public static async Task SendModifyBreakdown(HubConnection conn, string userRequest, string convId)
    {
        Console.WriteLine("✏️  Sending ModifyBreakdown → hub");
        Console.WriteLine($"   🗒️  UserRequest: {userRequest}");
        Console.WriteLine($"   🧵 ConversationId: {convId}");
        await conn.InvokeAsync("ModifyBreakdown", userRequest, convId);
        Console.WriteLine("✅ ModifyBreakdown invoked (awaiting BotTyping / ReceiveBreakdown)\n");
    }
}
