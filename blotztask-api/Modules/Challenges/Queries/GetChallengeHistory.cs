using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Challenges.Enums;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Challenges.Queries;

public class GetChallengeHistoryQuery
{
    public required Guid UserId { get; init; }
}

public class GetChallengeHistoryQueryHandler(BlotzTaskDbContext db)
{
    // Every challenge the user was in that has ended, newest first.
    public async Task<List<ChallengeHistoryItemDto>> Handle(GetChallengeHistoryQuery query, CancellationToken ct = default)
    {
        return await db.Challenges
            .AsNoTracking()
            .Where(c => c.EndTime != null &&
                        db.ChallengeMembers.Any(m => m.ChallengeId == c.Id && m.MemberId == query.UserId))
            .OrderByDescending(c => c.EndTime)
            .Select(c => new ChallengeHistoryItemDto
            {
                Id = c.Id,
                Name = c.Name,
                Status = c.Status,
                StartTime = c.StartTime,
                EndTime = c.EndTime!.Value
            })
            .ToListAsync(ct);
    }
}

public class ChallengeHistoryItemDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required ChallengeStatus Status { get; init; }
    public DateTimeOffset? StartTime { get; init; }
    public required DateTimeOffset EndTime { get; init; }
}
