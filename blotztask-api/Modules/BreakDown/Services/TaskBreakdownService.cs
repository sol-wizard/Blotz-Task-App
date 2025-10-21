using System.Text.Json;
using System.Xml;
using BlotzTask.Modules.BreakDown.Commands;
using BlotzTask.Modules.BreakDown.DTOs;
using BlotzTask.Modules.BreakDown.Prompts;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace BlotzTask.Modules.BreakDown.Services;

/// <summary>
/// Service for breaking down tasks into subtasks using AI.
/// Uses Semantic Kernel for prompt templating and structured output generation.
/// </summary>
public class TaskBreakdownService : ITaskBreakdownService
{
    private readonly Kernel _kernel;
    private readonly ILogger<TaskBreakdownService> _logger;

    public TaskBreakdownService(Kernel kernel, ILogger<TaskBreakdownService> logger)
    {
        _kernel = kernel;
        _logger = logger;
    }

    /// <summary>
    /// Breaks down a task into actionable subtasks using AI.
    /// </summary>
    /// <remarks>
    /// Why Semantic Kernel is used here:
    /// 1. Prompt Templating: SK handles {{$variable}} replacement in prompts via KernelArguments
    /// 2. Structured Output: SK integrates with OpenAI's JSON Schema response format to enforce type-safe output
    /// 3. Future Extensibility: If we add function calling, RAG, or multi-step planning, SK provides the infrastructure
    /// 4. Abstraction: SK provides a consistent API across different AI providers (OpenAI, Azure OpenAI, etc.)
    /// 
    /// Current usage is minimal (just prompt + structured output), but SK is kept for future AI features.
    /// </remarks>
    public async Task<List<SubTask>> BreakdownTaskAsync(
        string title,
        string? description,
        DateTime? startTime,
        DateTime? endTime,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Configure OpenAI execution settings with structured output
            // ResponseFormat = typeof(GeneratedSubTaskList) tells OpenAI to return JSON matching our DTO schema
            // This uses OpenAI's JSON Schema feature to enforce the response structure at the model level
            var executionSettings = new OpenAIPromptExecutionSettings
            {
                Temperature = 0.2, // Low temperature for more deterministic, consistent breakdowns
                ResponseFormat = typeof(GeneratedSubTaskList) // Enforces structured output via JSON Schema
            };

            // KernelArguments holds both the prompt variables and execution settings
            // SK will replace {{$title}}, {{$description}}, etc. in the prompt template
            var arguments = new KernelArguments(executionSettings)
            {
                ["title"] = title,
                ["description"] = description ?? "No description provided",
                ["startTime"] = startTime?.ToString("yyyy-MM-dd HH:mm") ?? "null",
                ["endTime"] = endTime?.ToString("yyyy-MM-dd HH:mm") ?? "null"
            };

            // InvokePromptAsync: SK's method for executing a prompt template with variable substitution
            // 1. Replaces {{$variable}} placeholders with values from arguments
            // 2. Sends the prompt to OpenAI with the specified execution settings
            // 3. Returns the structured JSON response
            var result = await _kernel.InvokePromptAsync(
                TaskBreakdownPrompts.BreakdownPrompt,
                arguments,
                cancellationToken: cancellationToken
            );

            var responseContent = result.ToString();

            if (string.IsNullOrEmpty(responseContent))
            {
                _logger.LogWarning("LLM returned no response for task breakdown");
                return [];
            }

            _logger.LogInformation("LLM raw result: {Content}", responseContent);

            // Deserialize the structured JSON response into our DTO
            // Because we used ResponseFormat = typeof(GeneratedSubTaskList), 
            // OpenAI guarantees the response matches this schema
            var parsedResult = JsonSerializer.Deserialize<GeneratedSubTaskList>(
                responseContent,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            );

            if (parsedResult == null)
            {
                _logger.LogWarning("Failed to parse structured output into {Type}", nameof(GeneratedSubTaskList));
                return [];
            }

            // Map DTOs to domain entities
            // XmlConvert.ToTimeSpan parses ISO 8601 durations (PT30M, PT1H30M, PT24H)
            // Note: We constrain the LLM to use hours/minutes/seconds only (no days like PT1D)
            // to ensure XmlConvert can parse it correctly
            return parsedResult.Subtasks.Select(st => new SubTask
            {
                Title = st.Title,
                Duration = XmlConvert.ToTimeSpan(st.Duration), // Parses ISO 8601: PT30M, PT1H, PT24H
                Order = st.Order,
            }).ToList();
        }
        catch (JsonException ex)
        {
            // Should rarely happen with structured output, but log if it does
            _logger.LogError(ex, "Failed to parse LLM response JSON. Content might be malformed");
            return [];
        }
        catch (TaskCanceledException)
        {
            // User or system canceled the request
            _logger.LogWarning("Task breakdown was canceled");
            return [];
        }
        catch (Exception ex)
        {
            // Catch-all for unexpected errors (network issues, model errors, etc.)
            _logger.LogError(
                ex,
                "Unexpected error during task breakdown. Title: {Title}, Exception: {Exception}",
                title,
                ex.Message
            );
            return [];
        }
    }
}
