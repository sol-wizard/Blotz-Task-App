using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.Domain;
using BlotzTask.Modules.Labels.Enums;
using System.ComponentModel.DataAnnotations;
namespace BlotzTask.Modules.Labels.Commands;

public class AddLabelCommand
{
    [Required]
    public string Name { get; set; } 
    [Required]
    public string Color { get; set; } 
    public string Description { get; set; }
    public LabelScope Scope { get; set; }
    public Guid? UserId { get; set; }
}

public class AddLabelCommandHandler(BlotzTaskDbContext db, ILogger<AddLabelCommandHandler> logger)
{
    public async Task<String> Handle(AddLabelCommand command, CancellationToken ct = default )
    {
        logger.LogInformation("Adding {Scope} label {Name}", command.Scope, command.Name);

        var addlabel = new Label
        {
            Name = command.Name,
            Color = command.Color,
            Description = command.Description,
            Scope = command.Scope,
            UserId = command.UserId
        };

        db.Labels.Add(addlabel);
        await db.SaveChangesAsync();

        return addlabel.Name;
    }
}

