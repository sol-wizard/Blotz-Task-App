using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.Commands;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Labels.Queries;

public class LabelDTO
{
    public int LabelId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class GetAllLabelsQueryHandler(BlotzTaskDbContext db, ILogger<AddLabelCommandHandler> logger)
{   
     public async Task<List<LabelDTO>> Handle(CancellationToken ct = default)
     {
         logger.LogInformation("Fetching all labels from database...");

         return await db.Labels
             .Select(l => new LabelDTO
             {
                 LabelId = l.LabelId,
                 Name = l.Name,
                 Color = l.Color,
                 Description = l.Description
             }).ToListAsync(ct);;
     }
    
}
