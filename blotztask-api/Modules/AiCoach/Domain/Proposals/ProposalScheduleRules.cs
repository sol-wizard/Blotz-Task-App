using BlotzTask.Modules.AiCoach.Domain.Candidates;
using BlotzTask.Modules.AiCoach.Domain.Modes;

namespace BlotzTask.Modules.AiCoach.Domain.Proposals;

/// <summary>
/// Single owner of proposal scheduling constraints. Generators use it to select a valid slot;
/// guards use it to validate candidates from every source against the same versioned policy.
/// </summary>
public static class ProposalScheduleRules
{
    public static string? Validate(
        TaskProposalCandidate proposal,
        DateTimeOffset userLocalNow,
        ProposalGenerationPolicy policy)
    {
        var start = proposal.Date.ToDateTime(proposal.StartTime);
        var end = proposal.Date.ToDateTime(proposal.EndTime);
        var earliestStart = userLocalNow.DateTime.AddMinutes(policy.MinimumLeadMinutes);

        if (start < earliestStart)
            return $"startTime must be at least {policy.MinimumLeadMinutes} minutes after the current local time.";

        if (!policy.AllowSameDay && proposal.Date == DateOnly.FromDateTime(userLocalNow.DateTime))
            return "same-day proposals are not allowed by the active proposal policy.";

        if (proposal.StartTime < policy.WorkingDayStart || proposal.EndTime > policy.WorkingDayEnd)
        {
            return $"time must be within working hours "
                   + $"{policy.WorkingDayStart:HH\\:mm}-{policy.WorkingDayEnd:HH\\:mm}.";
        }

        if (end <= start)
            return "endTime must be after startTime on the same day.";

        if (!IsAligned(proposal.StartTime, policy.SlotGranularityMinutes)
            || !IsAligned(proposal.EndTime, policy.SlotGranularityMinutes))
        {
            return $"startTime and endTime must align to {policy.SlotGranularityMinutes}-minute slots.";
        }

        return null;
    }

    public static DateTime NextAllowedStart(
        DateTime requestedStart,
        DateTimeOffset userLocalNow,
        ProposalGenerationPolicy policy,
        int durationMinutes)
    {
        var earliestStart = userLocalNow.DateTime.AddMinutes(policy.MinimumLeadMinutes);
        var start = RoundUp(requestedStart > earliestStart ? requestedStart : earliestStart,
            policy.SlotGranularityMinutes);
        var localToday = userLocalNow.Date;

        if (!policy.AllowSameDay && start.Date <= localToday)
            start = localToday.AddDays(1).Add(policy.WorkingDayStart.ToTimeSpan());

        if (start.TimeOfDay < policy.WorkingDayStart.ToTimeSpan())
            start = start.Date.Add(policy.WorkingDayStart.ToTimeSpan());

        if (start.TimeOfDay.Add(TimeSpan.FromMinutes(durationMinutes))
            > policy.WorkingDayEnd.ToTimeSpan())
        {
            start = start.Date.AddDays(1).Add(policy.WorkingDayStart.ToTimeSpan());
        }

        return start;
    }

    private static bool IsAligned(TimeOnly value, int granularityMinutes) =>
        value.Ticks % TimeSpan.FromMinutes(Math.Max(1, granularityMinutes)).Ticks == 0;

    private static DateTime RoundUp(DateTime value, int minutes)
    {
        var interval = TimeSpan.FromMinutes(Math.Max(1, minutes)).Ticks;
        return new DateTime(((value.Ticks + interval - 1) / interval) * interval, value.Kind);
    }
}
