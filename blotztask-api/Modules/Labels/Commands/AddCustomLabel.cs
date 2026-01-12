using System.ComponentModel.DataAnnotations;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Labels.Domain;
using BlotzTask.Modules.Labels.Enums;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Modules.Labels.Commands;

public class AddCustomLabelCommand
{
    [Required]
    public Guid UserId { get; set; }
    [Required]
    public string Name { get; set; }
    [Required, RegularExpression("^#(?:[0-9a-fA-F]{3}){1,2}$",
         ErrorMessage = "Color must be a valid hex code.")]
    public string Color { get; set; }
    public string? Description { get; set; }
}

public class AddCustomLabelCommandHandler(BlotzTaskDbContext db, ILogger<AddCustomLabelCommandHandler> logger)
{
    public async Task<string> Handle(AddCustomLabelCommand command, CancellationToken ct = default)
    {
        logger.LogInformation($"Prepare to creating label {command.Name}");

        bool exist = await db.Labels.AnyAsync(l =>
                l.UserId == command.UserId &&
                l.Name.ToLower() == command.Name.ToLower(),
            ct);

        if (exist)
        {
            throw new Exception($"Label {command.Name} already exists for  {command.UserId}.");
        }

        var label = new Label
        {
            Name = command.Name,
            Color = command.Color,
            Description = command.Description ?? string.Empty,
            Scope = LabelScope.Custom,
            UserId = command.UserId
        };
        db.Labels.AddAsync(label);
        await db.SaveChangesAsync(ct);
        return $"Created label {command.Name} for {command.UserId} successfully.";

    }

}