using BlotzTask.Modules.Challenges.Enums;

namespace BlotzTask.Modules.Challenges.Shared;

// One member's days, each judged in that member's own time zone.
// Active[i] is whether they opened the app on day i + 1; CompletedDays counts the days already over
// for them (today isn't over yet, so it can't count as missed).
public record MemberProgress(bool[] Active, int CompletedDays);

public static class ChallengeProgress
{
    public static MemberProgress ForMember(
        DateTimeOffset startTime, int periodDays, TimeZoneInfo timeZone,
        IReadOnlySet<DateOnly> activeDates, DateTime nowUtc)
    {
        // Day 1 is the member's local date at the moment the challenge started.
        var day1 = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(startTime, timeZone).DateTime);
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(nowUtc, timeZone));

        var active = Enumerable.Range(0, periodDays)
            .Select(i => activeDates.Contains(day1.AddDays(i)))
            .ToArray();
        var completedDays = Math.Clamp(today.DayNumber - day1.DayNumber, 0, periodDays);

        return new MemberProgress(active, completedDays);
    }

    // Succeeded once everyone has been active on every day. Failed as soon as anyone misses two days in
    // a row, or when the period is over for everyone without that. Otherwise still InProgress.
    public static ChallengeStatus Evaluate(IReadOnlyList<MemberProgress> members)
    {
        if (members.All(m => m.Active.All(isActive => isActive)))
            return ChallengeStatus.Succeeded;

        foreach (var member in members)
            for (var i = 1; i < member.CompletedDays; i++)
                if (!member.Active[i - 1] && !member.Active[i])
                    return ChallengeStatus.Failed;

        if (members.All(m => m.CompletedDays == m.Active.Length))
            return ChallengeStatus.Failed;

        return ChallengeStatus.InProgress;
    }
}
