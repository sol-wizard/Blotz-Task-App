using System.ComponentModel.DataAnnotations;

namespace BlotzTask.Modules.Tasks.Shared;

public static class TaskTitleValidator
{
    public static string TrimAndValidate(string? title)
    {
        var trimmed = title?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(trimmed))
            throw new ValidationException("Title is required.");
        return trimmed;
    }
}