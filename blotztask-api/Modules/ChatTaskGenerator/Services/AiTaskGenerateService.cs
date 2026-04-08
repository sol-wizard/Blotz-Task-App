using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Functions;
using BlotzTask.Shared.Exceptions;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IAiTaskGenerateService
{
    Task<AiGenerateMessage> GenerateAiResponse(ChatHistory chatHistory, CancellationToken ct);
}

public class AiTaskGenerateService(
    ILogger<AiTaskGenerateService> logger,
    ILogger<CreateTask> createTaskLogger,
    ILogger<CreateNote> createNoteLogger,
    Kernel kernel)
    : IAiTaskGenerateService
{
    public async Task<AiGenerateMessage> GenerateAiResponse(ChatHistory chatHistory, CancellationToken ct)
    {
        try
        {
            var createTask = new CreateTask(createTaskLogger);
            var createNote = new CreateNote(createNoteLogger);

            // kernel is registered as singleton
            var requestKernel = kernel.Clone();
            requestKernel.Plugins.AddFromObject(createTask, "CreateTask");
            requestKernel.Plugins.AddFromObject(createNote, "CreateNote");

            var executionSettings = new OpenAIPromptExecutionSettings
            {
                FunctionChoiceBehavior = FunctionChoiceBehavior.Auto(autoInvoke: false)
            };

            logger.LogInformation("TaskGeneration: Invoking AI with ServiceId=TaskGeneration");
            var chatService = requestKernel.GetRequiredService<IChatCompletionService>("TaskGeneration");

            var result = await chatService.GetChatMessageContentAsync(
                chatHistory,
                executionSettings,
                requestKernel,
                ct
            );

            logger.LogInformation("TaskGeneration: Response from ModelId={ModelId}", result.ModelId);
            logger.LogInformation("TaskGeneration: Response content={Content}", result.Content);

            // get all function need to be called
            var functionCalls = result.Items.OfType<FunctionCallContent>().ToList();

            logger.LogInformation("TaskGeneration: Processing {Count} function call(s)", functionCalls.Count);

            foreach (var functionCall in functionCalls)
                await functionCall.InvokeAsync(requestKernel, ct);

            var tasks = createTask.CollectedTasks;
            var notes = createNote.CollectedNotes;
            var isSuccess = tasks.Count > 0 || notes.Count > 0;

            logger.LogInformation("TaskGeneration: Extracted {TaskCount} tasks and {NoteCount} notes", tasks.Count, notes.Count);

            return new AiGenerateMessage
            {
                IsSuccess = isSuccess,
                ExtractedTasks = tasks,
                ExtractedNotes = notes,
                ErrorMessage = isSuccess ? "" : "No tasks or notes could be extracted from your input."
            };
        }
        catch (OperationCanceledException oce)
        {
            logger.LogInformation(oce, "AI task generation cancelled.");
            throw new AiTaskGenerationException(AiErrorCode.Canceled, "The request was canceled.", oce);
        }
        catch (HttpOperationException ex) when (
            ex.Message.Contains("429", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("quota", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("token", StringComparison.OrdinalIgnoreCase)
        )
        {
            logger.LogWarning(ex, "Token limit exceeded during AI task generation.");
            throw new AiTokenLimitedException();
        }
        catch (HttpOperationException ex) when (
            ex.Message.Contains("content_filter", StringComparison.OrdinalIgnoreCase)
        )
        {
            logger.LogWarning(ex, "Request blocked by Azure OpenAI content filter.");
            throw new AiContentFilterException();
        }
        catch (Exception ex)
        {
            logger.LogWarning("FULL EXCEPTION DETAILS: {ExceptionMessage}", ex.ToString());
            throw new AiTaskGenerationException(AiErrorCode.Unknown,
                "An unhandled exception occurred during AI task generation.", ex);
        }
    }
}
