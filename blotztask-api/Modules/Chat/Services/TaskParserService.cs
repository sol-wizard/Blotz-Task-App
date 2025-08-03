using System.Text.Json;
using BlotzTask.Modules.Labels.DTOs;
using BlotzTask.Modules.Labels.Services;
using BlotzTask.Shared.DTOs;

namespace BlotzTask.Modules.Chat.Services;

public interface ITaskParserService
{
    bool TryParseTasks(string response, out List<ExtractedTaskDto> tasks);
}
public class TaskParserService:ITaskParserService
{
    private readonly ILogger<TaskParserService> _logger;
    private readonly ILabelService _labelService;

    public TaskParserService(ILogger<TaskParserService> logger, ILabelService labelService)
    {
        _logger = logger;
        _labelService = labelService;
    }

    public bool TryParseTasks(string response, out List<ExtractedTaskDto> tasks)
    {
        tasks = [];

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
                ReadCommentHandling = JsonCommentHandling.Skip
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

            var labels = _labelService.GetAllLabelsAsync().GetAwaiter().GetResult();
            var labelNames = labels.Select(label => label.Name).ToHashSet();

            foreach (var taskElement in tasksArray.EnumerateArray())
            {
                if (taskElement.ValueKind != JsonValueKind.Object)
                {
                    _logger.LogWarning("Invalid task element found");
                    continue;  // Skip invalid tasks but keep processing others
                }

                try
                {
                    var extractedTask = JsonSerializer.Deserialize<ExtractedTask>(taskElement.GetRawText(), options);
                    if (extractedTask != null)
                    {
                        tasks.Add(HandleExtractedTask(extractedTask, labels, labelNames));
                    }
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "Failed to parse individual task");
                    continue;  // Skip this task but continue with others
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

    private ExtractedTaskDto HandleExtractedTask(ExtractedTask? extractedTask, List<LabelDto> labels, HashSet<string> labelNames)
    {
        if (extractedTask is null)
            throw new ArgumentNullException(nameof(extractedTask));

        if (!labelNames.Contains(extractedTask.Label))
        {
            extractedTask.Label = "Others";
        }

        return new ExtractedTaskDto
        {
            Title = extractedTask.Title,
            Description = extractedTask.Description,
            EndTime = extractedTask.EndTime,
            IsValidTask = extractedTask.IsValidTask,
            Label = labels.First(x => x.Name == extractedTask.Label)
        };
    }
}
