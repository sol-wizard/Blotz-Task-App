using System.Text.Json;
using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.ChatGoalPlanner.Services;

// TODO: Replace this by using function tool to parse tasks from the response
public class TaskParsingService
{
    private readonly ILogger<TaskParsingService> _logger;
    
    public TaskParsingService(ILogger<TaskParsingService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Tries to parse tasks from a JSON response into a list of GoalPlannerExtractedTaskDto objects.
    /// </summary>
    /// <param name="response">The JSON response string.</param>
    /// <param name="tasks">The parsed list of tasks.</param>
    /// <returns>True if tasks were successfully parsed, false otherwise.</returns>
    public bool TryParseTasks(string response, out List<ExtractedTaskGoalPlanner>? tasks)
    {
        return TryParseTasksInternal(
            response,
            (taskElement, options, labels, labelNames) =>
            {
                var rawExtractedTask = JsonSerializer.Deserialize<ExtractedTaskGoalPlannerRaw>(
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
            if (typeof(TTaskDto) == typeof(ExtractedTaskGoalPlanner))
            {
                // labels = _labelService.GetAllLabelsAsync().GetAwaiter().GetResult();
                // labelNames = labels.Select(label => label.Name).ToHashSet();
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
    private ExtractedTaskGoalPlanner MapRawExtractedTask(
        ExtractedTaskGoalPlannerRaw? extractedTask,
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

        return new ExtractedTaskGoalPlanner
        {
            Title = extractedTask.Title,
            Description = extractedTask.Description,
            EndTime = extractedTask.EndTime,
            IsValidTask = extractedTask.IsValidTask,
            Label = labels.First(x => x.Name == extractedTask.Label),
        };
    }
}
