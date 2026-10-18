using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Challenges.Enums;
using BlotzTask.Modules.Challenges.Shared;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Challenges.Queries;

public class GetCurrentChallengeQuery
{
    public required Guid UserId { get; init; }
}

public class GetCurrentChallengeQueryHandler(BlotzTaskDbContext db)
{
    // The user's unfinished challenge (there is at most one), or null when they aren't in any.
    public async Task<CurrentChallengeDto?> Handle(GetCurrentChallengeQuery query, CancellationToken ct = default)
    {
        var challenge = await db.Challenges
            .AsNoTracking()
            .Where(c => c.EndTime == null &&
                        db.ChallengeMembers.Any(m => m.ChallengeId == c.Id && m.MemberId == query.UserId))
            .FirstOrDefaultAsync(ct);

        if (challenge is null) return null;

        // Join order, so the creator comes first and each new member appears at the end.
        var members = await db.ChallengeMembers
            .AsNoTracking()
            .Where(m => m.ChallengeId == challenge.Id)
            .Join(db.AppUsers, m => m.MemberId, u => u.Id, (m, u) => new { m.JoinedAt, User = u })
            .OrderBy(x => x.JoinedAt)
            .Select(x => new ChallengeMemberDto
            {
                UserId = x.User.Id,
                DisplayName = x.User.DisplayName,
                PictureUrl = x.User.PictureUrl
            })
            .ToListAsync(ct);

        return new CurrentChallengeDto
        {
            Id = challenge.Id,
            Name = challenge.Name,
            Status = challenge.Status,
            CreatorUserId = challenge.CreatorUserId,
            RequiredMembers = ChallengeMembershipRules.RequiredMembers,
            Members = members
        };
    }
}

public class CurrentChallengeDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required ChallengeStatus Status { get; init; }
    public required Guid CreatorUserId { get; init; }
    public required int RequiredMembers { get; init; }
    public required List<ChallengeMemberDto> Members { get; init; }
}

public class ChallengeMemberDto
{
    public required Guid UserId { get; init; }
    public string? DisplayName { get; init; }
    public string? PictureUrl { get; init; }
}
