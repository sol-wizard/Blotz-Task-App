using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.UserUnderstanding.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.UserUnderstanding.Queries;

public class GetUserMemoriesQuery
{
    public required Guid UserId { get; init; }
}

public class UserMemoryDto
{
    public required Guid Id { get; init; }
    public required UserMemoryKind Kind { get; init; }
    public required string Content { get; init; }
    public DateTimeOffset? ValidUntil { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
}

public class GetUserMemoriesQueryHandler(BlotzTaskDbContext db, TimeProvider clock)
{
    /// <summary>Memories currently in effect, newest first; expired, superseded and deleted ones are hidden.</summary>
    public async Task<List<UserMemoryDto>> Handle(GetUserMemoriesQuery query, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow();
        return await db.UserMemories.AsNoTracking()
            .Where(m => m.UserId == query.UserId && m.Status == UserMemoryStatus.Active
                        && (m.ValidUntil == null || m.ValidUntil > now))
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => new UserMemoryDto
            {
                Id = m.Id, Kind = m.Kind, Content = m.Content, ValidUntil = m.ValidUntil, CreatedAt = m.CreatedAt,
            })
            .ToListAsync(ct);
    }
}
