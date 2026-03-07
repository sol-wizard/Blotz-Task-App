using System.ComponentModel.DataAnnotations.Schema;
using BlotzTask.Modules.Badges.Enum;

namespace BlotzTask.Modules.Badges.Domain;

public class Badge
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Description { get; set; }
    public required string IconUrl { get; set; }
    public BadgeCategory Category { get; set; }
    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
}
