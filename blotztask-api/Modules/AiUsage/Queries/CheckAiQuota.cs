using BlotzTask.Infrastructure.Data;

namespace BlotzTask.Modules.AiUsage.Queries;

public class CheckAiQuotaQuery
{
    public required Guid UserId { get; init; }
}

public class CheckAiQuotaQueryHandler(BlotzTaskDbContext db)
{
    public Task Handle(CheckAiQuotaQuery query, CancellationToken ct = default)
    {
        // Note: to be implemented
        throw new NotImplementedException();
    }
}
