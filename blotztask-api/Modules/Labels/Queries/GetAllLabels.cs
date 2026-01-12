using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.Commands;
using BlotzTask.Modules.Labels.Enums;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Labels.Queries;

public class GetAllLabelsQuery
{
    [Required] public required Guid UserId { get; init; }
}

public class LabelDTO
{
    public int LabelId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public LabelScope Scope { get; set; }
    public Guid? UserId { get; set; }
}

public class GetAllLabelsQueryHandler(BlotzTaskDbContext db, ILogger<AddLabelCommandHandler> logger)
{
    public async Task<List<LabelDTO>> Handle(GetAllLabelsQuery query, CancellationToken ct = default)
    {
        logger.LogInformation("Fetching all labels (Global + Custom for user {UserId}) from database...", query.UserId);

        return await db.Labels
            .Where(l => l.Scope == LabelScope.Global
                     || (l.Scope == LabelScope.Custom && l.UserId == query.UserId))
            .Select(l => new LabelDTO
            {
                LabelId = l.LabelId,
                Name = l.Name,
                Color = l.Color,
                Description = l.Description,
                Scope = l.Scope,
                UserId = l.UserId
            }).ToListAsync(ct);
    }
}
