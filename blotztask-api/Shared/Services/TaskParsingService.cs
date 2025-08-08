using System.Text.Json;
using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Modules.Labels.Services;
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Shared.Services;

public class TaskParsingService
{
    private readonly ILogger<TaskParsingService> _logger;
    private readonly ILabelService _labelService; // Assuming this is needed for GoalPlannerExtractedTaskDto mapping

    public TaskParsingService(ILogger<TaskParsingService> logger, ILabelService labelService)
    {
        _logger = logger;
        _labelService = labelService;
    }

    /// <summary>
    /// Tries to parse tasks from a JSON response into a list of GoalPlannerExtractedTaskDto objects.
    /// </summary>
    /// <param name="response">The JSON response string.</param>
    /// <param name="tasks">The parsed list of tasks.</param>
    /// <returns>True if tasks were successfully parsed, false otherwise.</returns>
    public bool TryParseTasks(string response, out List<GoalPlannerExtractedTaskDto>? tasks)
    {
        return TryParseTasksInternal(
            response,
            (taskElement, options, labels, labelNames) =>
            {
                var rawExtractedTask = JsonSerializer.Deserialize<GoalPlannerRawExtractedTask>(
                    taskElement.GetRawText(),
                    options
                );
                if (rawExtractedTask != null)
                {
                    return MapRawExtractedTask(rawExtractedTask, labels, labelNames);
                }
                return null;
            },
            out tasks
        );
    }

    /// <summary>
    /// Tries to parse tasks from a JSON response into a list of ExtractedTaskDto objects.
    /// </summary>
    /// <param name="response">The JSON response string.</param>
    /// <param name="tasks">The parsed list of tasks.</param>
    /// <returns>True if tasks were successfully parsed, false otherwise.</returns>
    public bool TryParseTasks(string response, out List<ExtractedTaskDto>? tasks)
    {
        return TryParseTasksInternal(
            response,
            (taskElement, options, _, _) =>
            {
                var rawExtractedTask = JsonSerializer.Deserialize<RawExtractedTask>(
                    taskElement.GetRawText(),
                    options
                );
                if (rawExtractedTask != null)
                {
                    return MapRawExtractedTask(rawExtractedTask);
                }
                return null;
            },
            out tasks
        );
    }

    /// <summary>
    /// Generic internal method to parse tasks from a JSON response.
    /// </summary>
    /// <typeparam name="TTaskDto">The type of the task DTO to parse into.</typeparam>
    /// <param name="response">The JSON response string.</param>
    /// <param name="taskMapper">A function to map a JsonElement representing a task to the desired TTaskDto type.</param>
    /// <param name="tasks">The parsed list of tasks.</param>
    /// <returns>True if tasks were successfully parsed, false otherwise.</returns>
    private bool TryParseTasksInternal<TTaskDto>(
        string response,
        Func<
            JsonElement,
            JsonSerializerOptions,
            List<LabelDto>,
            HashSet<string>,
            TTaskDto?
        > taskMapper,
        out List<TTaskDto>? tasks
    )
        where TTaskDto : class
    {
        tasks = new List<TTaskDto>();

        if (string.IsNullOrWhiteSpace(response))
        {
            _logger.LogWarning("Empty response received for task parsing");
            return false;
        }

        // Remove markdown code block markers if present
        var lines = response.Split('\n');
        response = string.Join("\n", lines.Where(line => !line.TrimStart().StartsWith("```")));

        // First check if this is a plain text response (not JSON)
        if (!response.Trim().StartsWith("{") && !response.Trim().StartsWith("["))
        {
            _logger.LogDebug("Response is not JSON, treating as plain text");
            return false;
        }

        try
        {
            var jsonStart = response.IndexOf('{');
            var jsonEnd = response.LastIndexOf('}') + 1;

            string jsonContent = response;

            if (jsonStart >= 0 && jsonEnd > jsonStart && jsonEnd <= response.Length)
            {
                jsonContent = response[jsonStart..jsonEnd];
                _logger.LogDebug("Extracted JSON content: {JsonContent}", jsonContent);
            }

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                AllowTrailingCommas = true,
                ReadCommentHandling = JsonCommentHandling.Skip,
            };

            var parsed = JsonSerializer.Deserialize<JsonElement>(jsonContent, options);

            // Check if this is a task response or just a regular message
            if (!parsed.TryGetProperty("tasks", out var tasksArray))
            {
                _logger.LogDebug("Response doesn't contain tasks property");
                return false;
            }

            if (tasksArray.ValueKind != JsonValueKind.Array)
            {
                _logger.LogWarning("Tasks property is not an array");
                return false;
            }

            // Label related logic only applies if the taskMapper needs it
            List<LabelDto>? labels = null;
            HashSet<string>? labelNames = null;

            // Only fetch labels if the taskMapper is of type GoalPlannerExtractedTaskDto
            if (typeof(TTaskDto) == typeof(GoalPlannerExtractedTaskDto))
            {
                labels = _labelService.GetAllLabelsAsync().GetAwaiter().GetResult();
                labelNames = labels.Select(label => label.Name).ToHashSet();
            }

            foreach (var taskElement in tasksArray.EnumerateArray())
            {
                if (taskElement.ValueKind != JsonValueKind.Object)
                {
                    _logger.LogWarning("Invalid task element found");
                    continue; // Skip invalid tasks but keep processing others
                }

                try
                {
                    var task = taskMapper(taskElement, options, labels, labelNames);
                    if (task != null)
                    {
                        tasks.Add(task);
                    }
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "Failed to parse individual task");
                }
            }

            return tasks.Count > 0;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "JSON parsing failed for response: {Response}", response);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error parsing tasks");
            return false;
        }
    }

    /// <summary>
    ///   Maps a raw extracted task to a GoalPlannerExtractedTaskDto.
    /// </summary>
    /// <param name="extractedTask"></param>
    /// <param name="labels"></param>
    /// <param name="labelNames"></param>
    /// <returns></returns>
    /// <exception cref="ArgumentNullException"></exception>
    private GoalPlannerExtractedTaskDto MapRawExtractedTask(
        GoalPlannerRawExtractedTask? extractedTask,
        List<LabelDto> labels,
        HashSet<string> labelNames
    )
    {
        if (extractedTask is null)
            throw new ArgumentNullException(nameof(extractedTask));

        if (!labelNames.Contains(extractedTask.Label))
        {
            extractedTask.Label = "Others";
        }

        return new GoalPlannerExtractedTaskDto
        {
            Title = extractedTask.Title,
            Description = extractedTask.Description,
            EndTime = extractedTask.EndTime,
            IsValidTask = extractedTask.IsValidTask,
            Label = labels.First(x => x.Name == extractedTask.Label),
        };
    }

    /// <summary>
    ///   Maps a raw extracted task to an ExtractedTaskDto.
    /// </summary>
    /// <param name="extractedTask"></param>
    /// <returns></returns>
    /// <exception cref="ArgumentNullException"></exception>
    private ExtractedTaskDto MapRawExtractedTask(RawExtractedTask? extractedTask)
    {
        if (extractedTask is null)
            throw new ArgumentNullException(nameof(extractedTask));

        return new ExtractedTaskDto
        {
            Title = extractedTask.Title,
            Description = extractedTask.Description,
            EndTime = extractedTask.EndTime,
        };
    }
}
