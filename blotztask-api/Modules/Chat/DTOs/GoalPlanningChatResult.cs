using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.Chat.DTOs;

public class GoalPlanningChatResult
{
    public ConversationMessage BotMessage { get; set; } = null!;
    public List<ExtractedTaskDto>? Tasks { get; set; } = null;
    public bool IsConversationComplete { get; set; }
}