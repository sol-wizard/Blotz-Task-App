using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Users.Commands;

public class UpsertPushTokenCommand
{
    [Required] public required string Token { get; init; }
    [Required] public required string DeviceId { get; init; }
    public Guid UserId { get; init; }
}

public class UpsertPushTokenCommandHandler(BlotzTaskDbContext db, ILogger<UpsertPushTokenCommandHandler> logger)
{
    public async Task Handle(UpsertPushTokenCommand command, CancellationToken ct = default)
    {
        var existing = await db.UserPushTokens
            .FirstOrDefaultAsync(t => t.DeviceId == command.DeviceId, ct);

        if (existing is not null)
        {
            existing.Token = command.Token;
            existing.UserId = command.UserId;
            existing.UpdatedAt = DateTime.UtcNow;
            db.UserPushTokens.Update(existing);
        }
        else
        {
            db.UserPushTokens.Add(new UserPushToken
            {
                UserId = command.UserId,
                Token = command.Token,
                DeviceId = command.DeviceId,
                UpdatedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Push token upserted for user {UserId}, device {DeviceId}", command.UserId, command.DeviceId);
    }
}
