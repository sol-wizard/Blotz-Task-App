using System.ComponentModel.DataAnnotations.Schema;
using BlotzTask.Modules.Badges.Enum;

namespace BlotzTask.Modules.Badges.Domain;

public class Badge
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    public required string NameEn { get; set; }
    public required string NameZh { get; set; }
    public required string DescriptionEn { get; set; }
    public required string DescriptionZh { get; set; }
    public required string IconUrl { get; set; }
    public BadgeCategory Category { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<BadgeCriteria> Criteria { get; set; } = [];
}
