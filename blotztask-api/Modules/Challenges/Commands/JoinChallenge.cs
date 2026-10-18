using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Challenges.Domain;
using BlotzTask.Modules.Challenges.Enums;
using BlotzTask.Modules.Challenges.Shared;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Challenges.Commands;

public class JoinChallengeCommand
{
    public required Guid UserId { get; init; }
    public required Guid ChallengeId { get; init; }
}

public class JoinChallengeCommandHandler(
    BlotzTaskDbContext db,
    ILogger<JoinChallengeCommandHandler> logger)
{
    public async Task Handle(JoinChallengeCommand command, CancellationToken ct = default)
    {
        // Locking the challenge row makes joins to the same challenge run one at a time until commit,
        // so two people can't both take the last spot. It also waits out a concurrent start.
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var challenge = await db.Challenges
            .FromSql($"SELECT * FROM [Challenges] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {command.ChallengeId}")
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Challenge not found.");

        if (challenge.Status != ChallengeStatus.NotStarted)
            throw new InvalidOperationException("This challenge has already started.");

        var alreadyMember = await db.ChallengeMembers
            .AnyAsync(m => m.ChallengeId == command.ChallengeId && m.MemberId == command.UserId, ct);
        if (alreadyMember)
            throw new InvalidOperationException("You are already in this challenge.");

        if (await ChallengeMembershipRules.IsInUnfinishedChallengeAsync(db, command.UserId, ct))
            throw new InvalidOperationException("You are already in another challenge that hasn't ended.");

        var memberCount = await db.ChallengeMembers.CountAsync(m => m.ChallengeId == command.ChallengeId, ct);
        if (memberCount >= ChallengeMembershipRules.RequiredMembers)
            throw new InvalidOperationException($"This challenge is full ({ChallengeMembershipRules.RequiredMembers} people).");

        db.ChallengeMembers.Add(new ChallengeMember { ChallengeId = command.ChallengeId, MemberId = command.UserId });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation("User {UserId} joined challenge {ChallengeId}", command.UserId, command.ChallengeId);
    }
}
