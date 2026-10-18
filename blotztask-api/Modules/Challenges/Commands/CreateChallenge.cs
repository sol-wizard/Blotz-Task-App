using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Challenges.Domain;
using BlotzTask.Modules.Challenges.Enums;
using Microsoft.EntityFrameworkCore;

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

        // The filtered unique index on CreatorUserId is the final guarantee; this check gives a clear message.
        var hasUnfinished = await db.Challenges
            .AnyAsync(c => c.CreatorUserId == command.UserId && c.EndTime == null, ct);
        if (hasUnfinished)
            throw new InvalidOperationException("You already have a challenge that hasn't ended.");

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
        // The creator is a member too, so they count towards the 7-person limit.
        db.ChallengeMembers.Add(new ChallengeMember { ChallengeId = challenge.Id, MemberId = command.UserId });

        await db.SaveChangesAsync(ct);

        logger.LogInformation("User {UserId} created challenge {ChallengeId}", command.UserId, challenge.Id);

        return challenge.Id;
    }
}
