using System.Diagnostics.CodeAnalysis;
using BlotzTask.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Users.Commands;

public record RecordUserActivityRequest(string? TimeZoneId);

public class RecordUserActivityCommand
{
    public required Guid UserId { get; init; }
    public string? TimeZoneId { get; init; }

    // Defaults to the current time; tests pin it to land on either side of local midnight.
    public DateTime? NowUtc { get; init; }
}

public class RecordUserActivityCommandHandler(
    BlotzTaskDbContext db,
    ILogger<RecordUserActivityCommandHandler> logger)
{
    public async Task Handle(RecordUserActivityCommand command, CancellationToken ct = default)
    {
        var timeZone = await ResolveTimeZoneAsync(command, ct);
        var nowUtc = command.NowUtc ?? DateTime.UtcNow;
        var localDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(nowUtc, timeZone));

        // Reopening the app on the same day is the common case, so a duplicate must be a silent
        // no-op rather than a key violation. The lock hints stop two concurrent calls for the same
        // day from both passing the NOT EXISTS check; the primary key is the final guarantee.
        var inserted = await db.Database.ExecuteSqlAsync($"""
            INSERT INTO [UserActivityDays] ([UserId], [LocalDate])
            SELECT {command.UserId}, {localDate}
            WHERE NOT EXISTS (
                SELECT 1 FROM [UserActivityDays] WITH (UPDLOCK, HOLDLOCK)
                WHERE [UserId] = {command.UserId} AND [LocalDate] = {localDate})
            """, ct);

        if (inserted > 0)
            logger.LogInformation(
                "Recorded activity day {LocalDate} for user {UserId} ({TimeZoneId})",
                localDate, command.UserId, timeZone.Id);
    }

    // The device timezone is preferred: it is where the user is right now, whereas the stored one
    // is only written at login and is null for users who signed in before it was introduced.
    // An unknown id falls through instead of failing — this call must never surface an error.
    private async Task<TimeZoneInfo> ResolveTimeZoneAsync(RecordUserActivityCommand command, CancellationToken ct)
    {
        if (TryFindTimeZone(command.TimeZoneId, out var requestTimeZone))
            return requestTimeZone;

        if (!string.IsNullOrWhiteSpace(command.TimeZoneId))
            logger.LogWarning(
                "Unknown timeZoneId '{TimeZoneId}' on activity call for user {UserId}; falling back",
                command.TimeZoneId, command.UserId);

        var storedTimeZoneId = await db.AppUsers
            .AsNoTracking()
            .Where(u => u.Id == command.UserId)
            .Select(u => u.Timezone)
            .FirstOrDefaultAsync(ct);

        return TryFindTimeZone(storedTimeZoneId, out var storedTimeZone) ? storedTimeZone : TimeZoneInfo.Utc;
    }

    private static bool TryFindTimeZone(string? timeZoneId, [NotNullWhen(true)] out TimeZoneInfo? timeZone)
    {
        timeZone = null;
        return !string.IsNullOrWhiteSpace(timeZoneId)
               && TimeZoneInfo.TryFindSystemTimeZoneById(timeZoneId, out timeZone);
    }
}
