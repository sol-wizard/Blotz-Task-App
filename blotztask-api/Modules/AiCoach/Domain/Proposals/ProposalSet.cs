using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.AiCoach.Domain.Proposals;

public enum ProposalSetStatus { Pending, Processing, Completed, Rejected }

public sealed record RecurrenceProposal(RecurrenceFrequency Frequency, int Interval,
    int? DaysOfWeek, int? DayOfMonth, DateOnly? EndDate);

public sealed record TaskProposal(
    Guid ProposalId,
    string Title,
    string? Description,
    DateOnly? Date,
    TimeOnly? StartTime,
    TimeOnly? EndTime,
    string TimeZoneId,
    int? LabelId,
    int? PersistedTaskId = null,
    RecurrenceProposal? Recurrence = null,
    int? PersistedSeriesId = null)
{
    public int? EstimatedMinutes => StartTime is { } start && EndTime is { } end
        ? (int)(end.ToTimeSpan() - start.ToTimeSpan()).TotalMinutes : null;
}

/// <summary>A draft is independent of the conversation and never a saved task.</summary>
public sealed class ProposalSet
{
    public required Guid Id { get; init; }
    public int Version { get; private set; } = 1;
    public ProposalSetStatus Status { get; private set; } = ProposalSetStatus.Pending;
    public IReadOnlyList<TaskProposal> Proposals { get; private set; } = [];
    public string? SaveError { get; private set; }
    public ScheduleAssessment? Schedule { get; private set; }

    public ProposalSet Copy() => new()
    {
        Id = Id, Version = Version, Status = Status,
        Proposals = Proposals.ToArray(), SaveError = SaveError, Schedule = Schedule,
    };

    public void Replace(IReadOnlyList<TaskProposal> proposals)
    {
        if (Status != ProposalSetStatus.Pending)
            throw new InvalidOperationException("Only pending drafts can be edited.");
        Proposals = proposals.ToArray();
        Schedule = null;
        Version++;
    }

    public void SetSchedule(ScheduleAssessment assessment)
    {
        Schedule = assessment;
        Version++;
    }

    public void StartSaving()
    {
        if (Status != ProposalSetStatus.Pending)
            throw new InvalidOperationException("Only pending drafts can be saved.");
        Status = ProposalSetStatus.Processing;
        SaveError = null;
        Version++;
    }

    public void RecordSaved(Guid itemId, int taskId, int? seriesId = null)
    {
        if (Status != ProposalSetStatus.Processing)
            throw new InvalidOperationException("Task results require an active save.");
        var existing = Proposals.SingleOrDefault(item => item.ProposalId == itemId)
            ?? throw new InvalidOperationException("Unknown saved item.");
        if (existing.PersistedTaskId.HasValue &&
            (existing.PersistedTaskId != taskId || existing.PersistedSeriesId != seriesId))
            throw new InvalidOperationException("A saved item cannot be assigned another task.");
        Proposals = Proposals.Select(item => item.ProposalId == itemId
            ? item with { PersistedTaskId = taskId, PersistedSeriesId = seriesId } : item).ToArray();
        Version++;
    }

    public void FinishSaving(string? error)
    {
        if (Status != ProposalSetStatus.Processing)
            throw new InvalidOperationException("No save is running.");
        SaveError = error;
        Status = Proposals.All(item => item.PersistedTaskId.HasValue)
            ? ProposalSetStatus.Completed : ProposalSetStatus.Pending;
        Version++;
    }

    public void CompleteSelection(IReadOnlyCollection<Guid> selectedItemIds)
    {
        if (Status != ProposalSetStatus.Processing)
            throw new InvalidOperationException("No save is running.");
        var selected = Proposals.Where(item => selectedItemIds.Contains(item.ProposalId)).ToArray();
        if (selected.Length != selectedItemIds.Count || selected.Any(item => !item.PersistedTaskId.HasValue))
            throw new InvalidOperationException("Every selected draft item must be saved.");
        var kept = Proposals.Where(item => item.PersistedTaskId.HasValue ||
            selectedItemIds.Contains(item.ProposalId)).ToArray();
        if (kept.Length == 0 || kept.Any(item => !item.PersistedTaskId.HasValue))
            throw new InvalidOperationException("Selected tasks must be saved before completing the draft.");
        Proposals = kept;
        Schedule = null;
        SaveError = null;
        Status = ProposalSetStatus.Completed;
        Version++;
    }

    public void Discard()
    {
        if (Status != ProposalSetStatus.Pending)
            throw new InvalidOperationException("Only pending drafts can be discarded.");
        Status = ProposalSetStatus.Rejected;
        Version++;
    }
}
