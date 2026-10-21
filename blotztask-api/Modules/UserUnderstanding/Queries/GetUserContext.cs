using System.Text;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.UserUnderstanding.Domain;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.UserUnderstanding.Queries;

public class GetUserContextQuery
{
    public required Guid UserId { get; init; }
}

/// <summary>
/// Builds a short, model-facing block about the user: stored settings, memories the user asked to keep,
/// and counted task data. Nothing is inferred, so every line can be traced to a table.
/// </summary>
public class GetUserContextQueryHandler(BlotzTaskDbContext db, TimeProvider clock)
{
    /// <summary>Recorded with traces so replies can be compared across context changes.</summary>
    public const string Version = "user-context-3";
    // Memories come first; facts that no longer fit are dropped rather than cut mid-line.
    public const int MaxBytes = 2500;
    private const int StatsWindowDays = 28;
    private const int MinStatsSample = 5;
    private const int ReviewMaxAgeDays = 45;
    private const int MaxFieldChars = 200;

    public async Task<string?> Handle(GetUserContextQuery query, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow();
        var lines = new List<string>();

        var user = await db.AppUsers.AsNoTracking()
            .Where(u => u.Id == query.UserId)
            .Select(u => new { u.DisplayName })
            .FirstOrDefaultAsync(ct);
        // Auth0 falls back to the email address when no name is set; that is not a name to call someone.
        if (!string.IsNullOrWhiteSpace(user?.DisplayName) && !user.DisplayName.Contains('@'))
            lines.Add($"- Name: {Truncate(user.DisplayName.Trim(), 50)}");

        var language = await db.UserPreferences.AsNoTracking()
            .Where(p => p.UserId == query.UserId)
            .Select(p => (Language?)p.PreferredLanguage)
            .FirstOrDefaultAsync(ct);
        if (language is { } preferred)
            lines.Add($"- App language setting: {preferred.ToDisplayName()}");

        if (await IsMemoryEnabledAsync(query.UserId, ct))
        {
            var memories = await db.UserMemories.AsNoTracking()
                .Where(m => m.UserId == query.UserId && m.Status == UserMemoryStatus.Active
                            && (m.ValidUntil == null || m.ValidUntil > now))
                .OrderByDescending(m => m.LastConfirmedAt)
                .ToListAsync(ct);
            var shown = 0;
            foreach (var memory in memories)
            {
                var until = memory.ValidUntil is { } end ? $" (until {end:yyyy-MM-dd})" : "";
                var line = $"- [{memory.Kind.ToString().ToLowerInvariant()} #{memory.Ref}] {memory.Content}{until}";
                // Leave room for the omission note so the model knows the list is incomplete.
                if (Fits(lines, line, reserve: 64)) { lines.Add(line); shown++; }
            }
            if (shown < memories.Count)
                lines.Add($"- {memories.Count - shown} more remembered items are not shown.");
        }

        var windowStart = now.AddDays(-StatsWindowDays);
        var windowTasks = db.TaskItems.AsNoTracking()
            .Where(t => t.UserId == query.UserId && t.EndTime >= windowStart && t.EndTime < now);
        var planned = await windowTasks.CountAsync(ct);
        // Planned times and the completion tick are all that is stored, so only volume and completion are stated.
        if (planned >= MinStatsSample)
        {
            var done = await windowTasks.CountAsync(t => t.IsDone, ct);
            var line = $"- Last {StatsWindowDays} days: {planned} tasks were scheduled to end, " +
                       $"{done} completed ({done * 100 / planned}%).";
            if (Fits(lines, line)) lines.Add(line);
        }

        var reviewCutoff = now.AddDays(-ReviewMaxAgeDays);
        var review = await db.ReviewReports.AsNoTracking()
            .Where(r => r.UserId == query.UserId && r.PeriodEndUtc >= reviewCutoff
                        && (r.Theme != null || r.OneThingToTryNext != null))
            .OrderByDescending(r => r.PeriodEndUtc)
            .Select(r => new { r.PeriodType, r.PeriodEndUtc, r.Theme, r.OneThingToTryNext })
            .FirstOrDefaultAsync(ct);
        if (review is not null)
        {
            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(review.Theme)) parts.Add($"theme \"{Truncate(review.Theme, MaxFieldChars)}\"");
            if (!string.IsNullOrWhiteSpace(review.OneThingToTryNext))
                parts.Add($"one thing to try next \"{Truncate(review.OneThingToTryNext, MaxFieldChars)}\"");
            var line = $"- Latest {review.PeriodType.ToString().ToLowerInvariant()} review " +
                       $"(period ended {review.PeriodEndUtc:yyyy-MM-dd}): {string.Join("; ", parts)}";
            if (Fits(lines, line)) lines.Add(line);
        }

        return lines.Count == 0 ? null : string.Join('\n', lines);
    }

    /// <summary>
    /// Changes whenever the memories in effect change (added, deleted, expired) or memory is switched on or off,
    /// so a segment re-captures its context on the next turn. Task statistics stay frozen for the segment.
    /// </summary>
    public async Task<string> GetMemoryStampAsync(Guid userId, CancellationToken ct = default)
    {
        var now = clock.GetUtcNow();
        var enabled = await IsMemoryEnabledAsync(userId, ct);
        var memories = db.UserMemories.AsNoTracking().Where(m => m.UserId == userId);
        var inEffect = await memories.CountAsync(m => m.Status == UserMemoryStatus.Active
                                                      && (m.ValidUntil == null || m.ValidUntil > now), ct);
        var lastChange = await memories.MaxAsync(m => (DateTimeOffset?)m.UpdatedAt, ct);
        return $"{enabled}:{inEffect}:{lastChange?.UtcTicks ?? 0}";
    }

    /// <summary>Users without a preference row have the default: on.</summary>
    public async Task<bool> IsMemoryEnabledAsync(Guid userId, CancellationToken ct = default) =>
        await db.UserPreferences.AsNoTracking().Where(p => p.UserId == userId)
            .Select(p => (bool?)p.AiMemoryEnabled).FirstOrDefaultAsync(ct) ?? true;

    private static bool Fits(List<string> lines, string line, int reserve = 0) =>
        Encoding.UTF8.GetByteCount(string.Join('\n', lines.Append(line))) + reserve <= MaxBytes;

    private static string Truncate(string value, int maxChars) =>
        value.Length <= maxChars ? value : value[..maxChars] + "…";
}
