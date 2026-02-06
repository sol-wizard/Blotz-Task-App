using BlotzTask.Infrastructure.Data;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Users.Commands;

public class DeleteUserCommandHandler(
    BlotzTaskDbContext db,
    ILogger<DeleteUserCommandHandler> logger)
{
    public async Task<string> Handle(Guid UserId, CancellationToken ct = default)
    {
        if (UserId == Guid.Empty)
            throw new ArgumentException("UserId is required.", nameof(UserId));

        var appUser = await db.AppUsers
            .AsNoTracking()
            .SingleOrDefaultAsync(u => u.Id == UserId, ct);

        if (appUser == null)
            throw new NotFoundException($"User with ID {UserId} not found.");

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {

            await db.Notes
                .Where(n => n.UserId == UserId)
                .ExecuteDeleteAsync(ct);

            await db.Subtasks
                .Where(s => db.TaskItems
                    .Where(t => t.UserId == UserId)
                    .Select(t => t.Id)
                    .Contains(s.ParentTaskId))
                .ExecuteDeleteAsync(ct);

            await db.TaskItems
                .Where(t => t.UserId == UserId)
                .ExecuteDeleteAsync(ct);

            await db.UserPreferences
                .Where(p => p.UserId == UserId)
                .ExecuteDeleteAsync(ct);

            await db.PomodoroSetting
                .Where(p => p.UserId == UserId)
                .ExecuteDeleteAsync(ct);

            await db.AppUsers
                .Where(u => u.Id == UserId)
                .ExecuteDeleteAsync(ct);

            await tx.CommitAsync(ct);
            logger.LogInformation("Deleted user data from database for {UserId}", UserId);
            return "User deleted from database successfully.";
        }
        catch (Exception ex)
        {
            await tx.RollbackAsync(ct);
            logger.LogError(ex, "Failed to delete user data for {UserId} from database", UserId);
            throw;
        }
    }
}
