using System;
using System.ComponentModel.DataAnnotations;
using BlotzTask.Modules.Labels.DTOs;

namespace BlotzTask.Modules.AiTask.DTOs;

public class AiBreakdownTaskInputDto
{
    [Required]
    [MinLength(3)]
    public required string Title { get; set; }

    [Required]
    [MinLength(5)]
    public required string Description { get; set; }

    public DateTimeOffset DueDate { get; set; }

    public bool IsDone { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public bool HasTime { get; set; }
}
