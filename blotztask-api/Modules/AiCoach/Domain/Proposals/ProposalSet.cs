using System.Text.Json.Serialization;
using BlotzTask.Modules.Tasks.Enums;

namespace BlotzTask.Modules.AiCoach.Domain.Proposals;

public enum ProposalSetStatus { Pending, Processing, Completed, Rejected, Expired }
public enum ProposalKind { Task, Note }

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
    int? PersistedSeriesId = null,
    ProposalKind Kind = ProposalKind.Task,
    Guid? PersistedNoteId = null,
    IReadOnlyList<string>? SuggestedFields = null)
{
    [JsonIgnore] public bool IsSaved => PersistedTaskId.HasValue || PersistedNoteId.HasValue;
    [JsonIgnore] public string NoteText => string.IsNullOrWhiteSpace(Description)
        ? Title.Trim() : Title.Trim() + "\n" + Description.Trim();
    public int? EstimatedMinutes => Kind == ProposalKind.Task && StartTime is { } start && EndTime is { } end
        ? (int)(end.ToTimeSpan() - start.ToTimeSpan()).TotalMinutes : null;

    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(Title)) throw new ArgumentException("Title is required.");
        if (!Enum.IsDefined(Kind)) throw new ArgumentException("Unknown item kind.");
        if (Kind == ProposalKind.Note)
        {
            if (Date is not null || StartTime is not null || EndTime is not null || Recurrence is not null
                || LabelId is not null || PersistedTaskId is not null || PersistedSeriesId is not null
                || SuggestedFields?.Count > 0)
                throw new ArgumentException("Notes cannot have task scheduling fields.");
            if (NoteText.Length > 2000) throw new ArgumentException("Note text max length is 2000.");
        }
        else if (PersistedNoteId is not null)
            throw new ArgumentException("Tasks cannot have a saved note ID.");
        if (SuggestedFields?.Any(field => field is not ("date" or "startTime" or "endTime")) == true)
            throw new ArgumentException("Unknown suggested schedule field.");
    }
}

/// <summary>A draft is independent of the conversation and never a saved task.</summary>
public sealed class ProposalSet
{
    public required Guid Id { get; init; }
    public bool IsReviewList { get; init; }
    [JsonInclude] public int Version { get; private set; } = 1;
    [JsonInclude] public ProposalSetStatus Status { get; private set; } = ProposalSetStatus.Pending;
    [JsonInclude] public IReadOnlyList<TaskProposal> Proposals { get; private set; } = [];
    [JsonInclude] public string? SaveError { get; private set; }
    [JsonInclude] public ScheduleAssessment? Schedule { get; private set; }
    [JsonInclude] public DateTimeOffset? SavingStartedAt { get; private set; }

    public ProposalSet Copy() => new()
    {
        Id = Id, IsReviewList = IsReviewList, Version = Version, Status = Status,
        Proposals = Proposals.ToArray(), SaveError = SaveError, Schedule = Schedule,
        SavingStartedAt = SavingStartedAt,
    };

    public void Replace(IReadOnlyList<TaskProposal> proposals)
    {
        if (Status != ProposalSetStatus.Pending)
            throw new InvalidOperationException("Only pending drafts can be edited.");
        if (proposals.Select(item => item.ProposalId).Distinct().Count() != proposals.Count)
            throw new ArgumentException("Duplicate item IDs.");
        foreach (var item in proposals) item.Validate();
        Proposals = proposals.ToArray();
        Schedule = null;
        Version++;
    }

    public void SetSchedule(ScheduleAssessment assessment)
    {
        Schedule = assessment;
        Version++;
    }

    public void StartSaving(DateTimeOffset startedAt)
    {
        if (Status != ProposalSetStatus.Pending)
            throw new InvalidOperationException("Only pending drafts can be saved.");
        Status = ProposalSetStatus.Processing;
        SavingStartedAt = startedAt;
        SaveError = null;
        Version++;
    }

    public void RecordSaved(Guid itemId, int taskId, int? seriesId = null)
    {
        if (Status != ProposalSetStatus.Processing)
            throw new InvalidOperationException("Task results require an active save.");
        var existing = Proposals.SingleOrDefault(item => item.ProposalId == itemId)
            ?? throw new InvalidOperationException("Unknown saved item.");
        if (existing.Kind != ProposalKind.Task) throw new InvalidOperationException("Item is not a task.");
        if (existing.PersistedTaskId.HasValue &&
            (existing.PersistedTaskId != taskId || existing.PersistedSeriesId != seriesId))
            throw new InvalidOperationException("A saved item cannot be assigned another task.");
        Proposals = Proposals.Select(item => item.ProposalId == itemId
            ? item with { PersistedTaskId = taskId, PersistedSeriesId = seriesId } : item).ToArray();
        Version++;
    }

    public void RecordSavedNote(Guid itemId, Guid noteId)
    {
        if (Status != ProposalSetStatus.Processing)
            throw new InvalidOperationException("Note results require an active save.");
        var existing = Proposals.SingleOrDefault(item => item.ProposalId == itemId)
            ?? throw new InvalidOperationException("Unknown saved item.");
        if (existing.Kind != ProposalKind.Note || existing.PersistedNoteId is { } saved && saved != noteId)
            throw new InvalidOperationException("Invalid saved note result.");
        Proposals = Proposals.Select(item => item.ProposalId == itemId
            ? item with { PersistedNoteId = noteId } : item).ToArray();
        Version++;
    }

    public void FinishSaving(string? error)
    {
        if (Status != ProposalSetStatus.Processing)
            throw new InvalidOperationException("No save is running.");
        SaveError = error;
        SavingStartedAt = null;
        Status = Proposals.All(item => item.IsSaved)
            ? ProposalSetStatus.Completed : ProposalSetStatus.Pending;
        Version++;
    }

    /// <summary>
    /// Return a save abandoned by a stopped process to pending. Tasks committed just before the stop are not
    /// recorded, so a retry can duplicate them.
    /// </summary>
    public void ReleaseInterruptedSave()
    {
        if (Status != ProposalSetStatus.Processing)
            throw new InvalidOperationException("No save is running.");
        Status = ProposalSetStatus.Pending;
        SaveError = "TaskPersistenceInterrupted";
        SavingStartedAt = null;
        Version++;
    }

    public void CompleteSelection(IReadOnlyCollection<Guid> selectedItemIds)
    {
        if (Status != ProposalSetStatus.Processing)
            throw new InvalidOperationException("No save is running.");
        var selected = Proposals.Where(item => selectedItemIds.Contains(item.ProposalId)).ToArray();
        if (selected.Length != selectedItemIds.Count || selected.Any(item => !item.IsSaved))
            throw new InvalidOperationException("Every selected draft item must be saved.");
        var kept = Proposals.Where(item => item.IsSaved ||
            selectedItemIds.Contains(item.ProposalId)).ToArray();
        if (kept.Length == 0 || kept.Any(item => !item.IsSaved))
            throw new InvalidOperationException("Selected tasks must be saved before completing the draft.");
        Proposals = kept;
        Schedule = null;
        SaveError = null;
        SavingStartedAt = null;
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

    public void Expire()
    {
        if (Status != ProposalSetStatus.Pending)
            throw new InvalidOperationException("Only pending drafts can expire.");
        Status = ProposalSetStatus.Expired;
        Version++;
    }
}
