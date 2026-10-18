using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Challenges.Domain;
using BlotzTask.Modules.Challenges.Enums;
using BlotzTask.Modules.Challenges.Shared;

namespace BlotzTask.Modules.Challenges.Commands;

public record CreateChallengeRequest(string Name);

public class CreateChallengeCommand
{
    public required Guid UserId { get; init; }
    public required string Name { get; init; }
}

public class CreateChallengeCommandHandler(
    BlotzTaskDbContext db,
    ILogger<CreateChallengeCommandHandler> logger)
{
    private const int PeriodDays = 7;
    private const int MaxNameLength = 100;

    public async Task<Guid> Handle(CreateChallengeCommand command, CancellationToken ct = default)
    {
        var name = command.Name.Trim();
        if (string.IsNullOrEmpty(name))
            throw new ArgumentException("Challenge name is required.");
        if (name.Length > MaxNameLength)
            throw new ArgumentException($"Challenge name must be at most {MaxNameLength} characters.");

        // The filtered unique index on CreatorUserId also stops a double-tap creating two.
        if (await ChallengeMembershipRules.IsInUnfinishedChallengeAsync(db, command.UserId, ct))
            throw new InvalidOperationException("You are already in a challenge that hasn't ended.");

        var challenge = new Challenge
        {
            Id = Guid.NewGuid(),
            CreatorUserId = command.UserId,
            Name = name,
            PeriodDays = PeriodDays,
            Status = ChallengeStatus.NotStarted,
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.Challenges.Add(challenge);
        // The creator is a member too, so they count towards the required members.
        db.ChallengeMembers.Add(new ChallengeMember
        {
            ChallengeId = challenge.Id,
            MemberId = command.UserId,
            JoinedAt = challenge.CreatedAt
        });

        await db.SaveChangesAsync(ct);

        logger.LogInformation("User {UserId} created challenge {ChallengeId}", command.UserId, challenge.Id);

        return challenge.Id;
    }
}
