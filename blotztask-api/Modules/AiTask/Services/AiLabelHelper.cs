using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Modules.Labels.Services;

namespace BlotzTask.Modules.AiTask.Services;

public static class AiLabelHelper
{
    public static async Task<(List<LabelDto> labels, HashSet<string> labelNames)> GetLabelInfoAsync(ILabelService labelService)
    {
        var labels = await labelService.GetAllLabelsAsync();
        var labelNames = labels.Select(label => label.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
        return (labels, labelNames);
    }

    public static string ValidateLabel(string labelName, HashSet<string> labelNames)
    {
        return labelNames.Contains(labelName) ? labelName : "Others";
    }

    public static LabelDto ResolveLabel(string labelName, List<LabelDto> labels)
    {
        return labels.First(l => l.Name.Equals(labelName, StringComparison.OrdinalIgnoreCase));
    }

    public static string GetLabelPromptString(HashSet<string> labelNames)
    {
        return string.Join(", ", labelNames);
    }
}