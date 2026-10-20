using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Challenges.Enums;
using BlotzTask.Modules.Challenges.Shared;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Challenges.Queries;

public class GetCurrentChallengeQuery
{
    public required Guid UserId { get; init; }

    // Defaults to the current time; tests pin it to a given challenge day.
    public DateTime? NowUtc { get; init; }
}

public class GetCurrentChallengeQueryHandler(
    BlotzTaskDbContext db,
    ILogger<GetCurrentChallengeQueryHandler> logger)
{
    // The user's unfinished challenge (there is at most one), or null when they aren't in any.
    // A running challenge is judged here, each time a member opens it: if the result is Succeeded or
    // Failed it is ended now, and this response still carries it so the member sees the outcome once.
    public async Task<CurrentChallengeDto?> Handle(GetCurrentChallengeQuery query, CancellationToken ct = default)
    {
        var nowUtc = query.NowUtc ?? DateTime.UtcNow;

        var challenge = await db.Challenges
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
            .Select(x => new { x.User.Id, x.User.DisplayName, x.User.PictureUrl, x.User.Timezone })
            .ToListAsync(ct);

        var progress = new Dictionary<Guid, MemberProgress>();
        if (challenge.Status == ChallengeStatus.InProgress && challenge.StartTime is { } startTime)
        {
            var memberIds = members.Select(m => m.Id).ToList();
            // Day 1 can be a calendar day either side of the UTC start date, depending on the time zone.
            var from = DateOnly.FromDateTime(startTime.UtcDateTime).AddDays(-1);
            var to = from.AddDays(challenge.PeriodDays + 2);
            var activeDates = (await db.UserActivityDays
                    .AsNoTracking()
                    .Where(a => memberIds.Contains(a.UserId) && a.LocalDate >= from && a.LocalDate <= to)
                    .ToListAsync(ct))
                .ToLookup(a => a.UserId, a => a.LocalDate);

            foreach (var member in members)
                progress[member.Id] = ChallengeProgress.ForMember(
                    startTime, challenge.PeriodDays, ResolveTimeZone(member.Timezone),
                    activeDates[member.Id].ToHashSet(), nowUtc);

            var status = ChallengeProgress.Evaluate(progress.Values.ToList());
            if (status != ChallengeStatus.InProgress)
            {
                challenge.Status = status;
                challenge.EndTime = new DateTimeOffset(nowUtc, TimeSpan.Zero);
                await db.SaveChangesAsync(ct);
                logger.LogInformation("Challenge {ChallengeId} ended as {Status}", challenge.Id, status);
            }
        }

        return new CurrentChallengeDto
        {
            Id = challenge.Id,
            Name = challenge.Name,
            Status = challenge.Status,
            CreatorUserId = challenge.CreatorUserId,
            RequiredMembers = ChallengeMembershipRules.RequiredMembers,
            PeriodDays = challenge.PeriodDays,
            StartTime = challenge.StartTime,
            Members = members.Select(m => new ChallengeMemberDto
            {
                UserId = m.Id,
                DisplayName = m.DisplayName,
                PictureUrl = m.PictureUrl,
                ActiveDays = progress.TryGetValue(m.Id, out var p) ? p.Active : []
            }).ToList()
        };
    }

    private static TimeZoneInfo ResolveTimeZone(string? timeZoneId) =>
        !string.IsNullOrWhiteSpace(timeZoneId) && TimeZoneInfo.TryFindSystemTimeZoneById(timeZoneId, out var timeZone)
            ? timeZone
            : TimeZoneInfo.Utc;
}

public class CurrentChallengeDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required ChallengeStatus Status { get; init; }
    public required Guid CreatorUserId { get; init; }
    public required int RequiredMembers { get; init; }
    public required int PeriodDays { get; init; }
    public DateTimeOffset? StartTime { get; init; }
    public required List<ChallengeMemberDto> Members { get; init; }
}

public class ChallengeMemberDto
{
    public required Guid UserId { get; init; }
    public string? DisplayName { get; init; }
    public string? PictureUrl { get; init; }

    // One entry per challenge day, true when they were active that day. Empty before the challenge starts.
    public required bool[] ActiveDays { get; init; }
}
