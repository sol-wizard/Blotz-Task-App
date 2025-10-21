using BlotzTask.Modules.BreakDown.Commands;

namespace BlotzTask.Modules.BreakDown.Services;

public interface ITaskBreakdownService
{
    Task<List<SubTask>> BreakdownTaskAsync(
        string title,
        string? description,
        DateTime? startTime,
        DateTime? endTime,
        CancellationToken cancellationToken = default);
}
