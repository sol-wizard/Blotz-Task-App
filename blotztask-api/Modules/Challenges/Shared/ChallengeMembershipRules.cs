using BlotzTask.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Challenges.Shared;

public static class ChallengeMembershipRules
{
    // A challenge needs exactly this many members: joining stops here, and starting needs it full.
    public const int RequiredMembers = 9;

    // A user can be in only one unfinished challenge at a time, created or joined. The creator is a
    // member row too, so this one check covers both. A challenge is finished once EndTime is set.
    public static Task<bool> IsInUnfinishedChallengeAsync(BlotzTaskDbContext db, Guid userId, CancellationToken ct) =>
        db.Challenges.AnyAsync(c =>
            c.EndTime == null &&
            db.ChallengeMembers.Any(m => m.ChallengeId == c.Id && m.MemberId == userId), ct);
}
