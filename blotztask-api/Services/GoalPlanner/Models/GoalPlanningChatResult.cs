using BlotzTask.Models;
using BlotzTask.Models.GoalToTask;

namespace BlotzTask.Services.GoalPlanner.Models;

public class GoalPlanningChatResult
{
    public ConversationMessage BotMessage { get; set; } = null!;
    public List<ExtractedTaskDTO>? Tasks { get; set; } = null;
    public bool IsConversationComplete { get; set; }
}