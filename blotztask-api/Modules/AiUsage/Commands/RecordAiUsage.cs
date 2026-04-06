using BlotzTask.Infrastructure.Data;

namespace BlotzTask.Modules.AiUsage.Commands;

public class RecordAiUsageCommand
{
    public required Guid UserId { get; init; }
    public required int PromptTokens { get; init; }
    public required int CompletionTokens { get; init; }
}

public class RecordAiUsageCommandHandler(BlotzTaskDbContext db)
{
    public Task Handle(RecordAiUsageCommand command, CancellationToken ct = default)
    {  
        // Note: to be implemented
        throw new NotImplementedException();
    }
}
