
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BlotzTask.Modules.AiTask.DTOs;

public class BreakdownAiResult
{
    public string Action { get; set; } = default!;
    public List<BreakdownAiSubtask>? Subtasks { get; set; }
}

public class BreakdownAiSubtask
{
    public string Title { get; set; } = default!;
    public string Description { get; set; } = default!;
    public string Label { get; set; } = default!;
}
