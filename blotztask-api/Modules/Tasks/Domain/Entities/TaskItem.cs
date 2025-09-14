﻿using System.ComponentModel.DataAnnotations.Schema;
using BlotzTask.Modules.Labels.Domain;
using BlotzTask.Modules.Users.Domain;

namespace BlotzTask.Modules.Tasks.Domain.Entities;

public class TaskItem
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset? StartTime { get; set; }
    public DateTimeOffset? EndTime { get; set; }
    public bool IsDone { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public required Guid UserId { get; set; }
    public AppUser User { get; set; }
    public required int LabelId { get; set; }
    public Label Label { get; set; }
    public ICollection<Subtask> Subtasks { get; set; } = new List<Subtask>();
}