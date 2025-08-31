using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.Chat.DTOs;

public class AiTaskGenerateChatResult
{
    public ConversationMessage BotMessage { get; set; } = null!;
    public List<ExtractedTask>? Tasks { get; set; } = null;
    public bool IsConversationComplete { get; set; }
}