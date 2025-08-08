using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.AIChat.DTOs;

public class GoalPlanningChatResult
{
    public ConversationMessage BotMessage { get; set; } = null!;
    public List<GoalPlannerExtractedTaskDto>? Tasks { get; set; } = null;
    public bool IsConversationComplete { get; set; }
}