using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Labels.Queries;

public class GetLabelTaskCountQuery
{
    [Required] public required int LabelId { get; init; }
}

public class GetLabelTaskCountQueryHandler(BlotzTaskDbContext db, ILogger<GetLabelTaskCountQueryHandler> logger)
{
    public async Task<LabelTaskCountDto> Handle(GetLabelTaskCountQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Checking task count for label {LabelId}...", query.LabelId);

        var labelExists = await db.Labels
            .AnyAsync(l => l.LabelId == query.LabelId, ct);

        if (!labelExists)
        {
			throw new NotFoundException($"Label with ID {query.LabelId} not found.");
        }

        var taskCount = await db.TaskItems
            .CountAsync(t => t.LabelId == query.LabelId, ct);

        logger.LogInformation("Label {LabelId} has {TaskCount} tasks.", query.LabelId, taskCount);

        return new LabelTaskCountDto
        {
            LabelId = query.LabelId,
            TaskCount = taskCount
        };
    }
}
