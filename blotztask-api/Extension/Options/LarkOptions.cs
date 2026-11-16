using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Extension.Options;

public sealed class LarkOptions
{
    public const string SectionName = "Lark";

    [Required]
    public string AppId { get; set; } = "";

    [Required]
    public string AppSecret { get; set; } = "";

    [Required]
    public string FeedbackBaseToken { get; set; } = "";

    [Required]
    public string FeedbackTableId { get; set; } = "";
}
