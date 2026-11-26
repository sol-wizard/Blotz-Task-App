using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.AiCoach.Application.Queries;

public class FindDeletedSavedItemsQuery
{
    public required Guid UserId { get; init; }
    public required IReadOnlyList<ProposalSet> Drafts { get; init; }
}

/// <summary>
/// Saved review items whose task or note the user has since deleted in the app. The coach's drafts still show
/// them as saved, so without this it treats them as existing and won't add them again.
/// </summary>
public class FindDeletedSavedItemsQueryHandler(BlotzTaskDbContext db)
{
    public async Task<IReadOnlySet<Guid>> Handle(FindDeletedSavedItemsQuery query, CancellationToken ct = default)
    {
        // A saved recurring item points at its recurring template, not at a TaskItems row, so it is not checked here.
        var items = query.Drafts.SelectMany(draft => draft.Proposals)
            .Where(item => item.PersistedSeriesId is null && item.IsSaved).ToArray();
        var taskIds = items.Where(item => item.PersistedTaskId.HasValue).Select(item => item.PersistedTaskId!.Value).Distinct().ToArray();
        var noteIds = items.Where(item => item.PersistedNoteId.HasValue).Select(item => item.PersistedNoteId!.Value).Distinct().ToArray();
        if (taskIds.Length == 0 && noteIds.Length == 0) return new HashSet<Guid>();

        var liveTasks = taskIds.Length == 0 ? [] : (await db.TaskItems.AsNoTracking()
            .Where(task => task.UserId == query.UserId && taskIds.Contains(task.Id))
            .Select(task => task.Id).ToListAsync(ct)).ToHashSet();
        var liveNotes = noteIds.Length == 0 ? [] : (await db.Notes.AsNoTracking()
            .Where(note => note.UserId == query.UserId && noteIds.Contains(note.Id))
            .Select(note => note.Id).ToListAsync(ct)).ToHashSet();

        return items.Where(item => item.PersistedTaskId is { } taskId && !liveTasks.Contains(taskId)
                || item.PersistedNoteId is { } noteId && !liveNotes.Contains(noteId))
            .Select(item => item.ProposalId).ToHashSet();
    }
}
