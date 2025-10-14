﻿using System.ComponentModel;
using System.Text.Json.Serialization;

namespace BlotzTask.Modules.BreakDown.DTOs;

public class GeneratedSubTask
{
    [JsonPropertyName("title")]
    [Description("A short, descriptive name for the subtask")]
    public string Title { get; set; } = string.Empty;
    
    [JsonPropertyName("duration")]
    [Description("Duration in HH:mm:ss format (e.g., '00:30:00' for 30 minutes, '01:30:00' for 1.5 hours)")]
    public string Duration { get; set; } = string.Empty;
    
    [JsonPropertyName("order")]
    [Description("Sequential order of the subtask, starting from 1")]
    public int Order { get; set; }
}