using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.GoalPlannerChat.Dtos;

public class GoalPlanningChatResult
{
    public ConversationMessage BotMessage { get; set; } = null!;
    public List<ExtractedTaskGoalPlanner>? Tasks { get; set; } = null;
    public bool IsConversationComplete { get; set; }
}