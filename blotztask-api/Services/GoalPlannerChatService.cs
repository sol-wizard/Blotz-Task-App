namespace BlotzTask.Services;


public interface IGoalPlannerChatService
{
    Task<string> HandleSendMessage(string user, string message, string conversationId);
}

public class GoalPlannerChatService : IGoalPlannerChatService
{
    public async Task<string> HandleSendMessage(string user, string message, string conversationId)
    {
        
        Console.WriteLine($"Sending message: {message}");   
        Console.WriteLine($"ConversationId: {conversationId}");
        Console.WriteLine($"User: {user}");
        await Task.Delay(500);

        return "response from bot";
    }
}