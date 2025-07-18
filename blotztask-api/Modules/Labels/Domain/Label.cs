﻿using System.ComponentModel.DataAnnotations.Schema;
using BlotzTask.Modules.Tasks.Domain;

namespace BlotzTask.Modules.Labels.Domain;

//TODO: Check if we need this 
public enum LabelType
{
    Work,
    Personal,
    Academic,
    Others
}

public class Label
{
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int LabelId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public ICollection<TaskItem> TaskItems { get; set; } = new List<TaskItem>();
}