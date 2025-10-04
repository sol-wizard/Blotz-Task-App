using System.Text.Json;
using BlotzTask.Modules.DailyReminderGenerator.Dtos;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;

namespace BlotzTask.Modules.DailyReminderGenerator.Services;

public class AiReminderService
{
    private readonly IChatCompletionService _chatCompletionService;
    private readonly GetTasksByDateQueryHandler _getTasksByDate;
    private readonly Kernel _kernel;
    private readonly ILogger<AiReminderService> _logger;

    public AiReminderService(
        Kernel kernel,
        IChatCompletionService chatCompletionService,
        ILogger<AiReminderService> logger,
        GetTasksByDateQueryHandler getTasksByDateQueryHandler)
    {
        _kernel = kernel;
        _chatCompletionService = chatCompletionService;
        _logger = logger;
        _getTasksByDate = getTasksByDateQueryHandler;
    }

    public async Task<ReminderResult?> GenerateReminderForTodayAsync(Guid userId, CancellationToken ct = default)
    {
        var query = new GetTasksByDateQuery
        {
            UserId = userId,
            StartDateUtc = DateTimeOffset.UtcNow.Date,
            IncludeFloatingForToday = true
        };
        var todayTasks = (await _getTasksByDate.Handle(query, ct)).ToList();
        _logger.LogInformation("Fetched {TotalTasks} tasks for today (including floating).", todayTasks.Count);
        
        var todoTasks = todayTasks
            .Where(t => !t.IsDone)
            .ToList();
        
        _logger.LogInformation("Fetched {TotalTasks} todo tasks for today (including floating).", todoTasks.Count);

        if (todoTasks.Count == 0) return null;

        var tasksJson = JsonSerializer.Serialize(new
        {
            todayUtc = DateTimeOffset.UtcNow,
            tasks = todoTasks
        });
        
        

        var history = new ChatHistory();
        history.AddUserMessage(tasksJson);
        var generateReminderFunction = _kernel.Plugins["ReminderGenerationPlugin"]["GenerateReminder"];
        var reminderSettings = new PromptExecutionSettings
        {
            FunctionChoiceBehavior = FunctionChoiceBehavior.Required(
                new[] { generateReminderFunction }
            )
        };
        
        _logger.LogDebug(
            "Invoking SK function. Plugin={Plugin}, Function={Function}, Settings={Settings}",
            generateReminderFunction.PluginName,
            generateReminderFunction.Name,
            JsonSerializer.Serialize(reminderSettings));

        try
        {
            var reminderResult = await _chatCompletionService.GetChatMessageContentsAsync(
                history,
                reminderSettings,
                _kernel,
                ct
            );

            var content = reminderResult.LastOrDefault()?.Content;
            if (string.IsNullOrWhiteSpace(content))
            {
                _logger.LogWarning("Model returned empty content. Returning null (HTTP 204).");
                return null;
            }
            
            var reminder = JsonSerializer.Deserialize<ReminderResult>(content!,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (reminder?.TaskId is null || string.IsNullOrWhiteSpace(reminder.ReminderText))
            {
                _logger.LogWarning("Reminder missing required fields. TaskId={TaskId}, HasText={HasText}",
                    reminder?.TaskId, !string.IsNullOrWhiteSpace(reminder?.ReminderText));
                return null;
            }
                
            if (!todoTasks.Any(t => t.Id == reminder.TaskId.Value)) return null;

            return reminder;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "GenerateReminderForTodayAsync failed.");
            return null;
        }
    }
}