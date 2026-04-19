using System.ComponentModel;
using Azure.AI.Projects;
using BlotzTask.Modules.Notes.DTOs;
using BlotzTask.Modules.Notes.Prompts;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.Users.Queries;
using BlotzTask.Shared.Exceptions;
using Microsoft.Extensions.AI;

namespace BlotzTask.Modules.Notes.Commands;

public class NoteTimeEstimationDto
{
    public Guid Id { get; set; }

    public required string Text { get; set; }
}

public class NoteTimeEstimationRequest
{
    public Guid NoteId { get; set; }
    public Guid UserId { get; set; }
    public required string Text { get; set; }
}

public class TimeEstimateCommandHandler(
    ILogger<TimeEstimateCommandHandler> logger,
    GetUserPreferencesQueryHandler getUserPreferencesQueryHandler,
    AIProjectClient projectClient,
    IConfiguration configuration)
{
    private readonly string _deploymentId =
        configuration["AzureOpenAI:AiModels:Breakdown:DeploymentId"]
        ?? throw new InvalidOperationException("Missing AzureOpenAI:AiModels:Breakdown:DeploymentId config.");

    public async Task<AITimeEstimationResult?> Handle(NoteTimeEstimationRequest request, CancellationToken ct = default)
    {
        logger.LogInformation("AI is estimating time for note: {NoteId}", request.NoteId);

        var userPreferencesQuery = new GetUserPreferencesQuery { UserId = request.UserId };
        var userPreferences = await getUserPreferencesQueryHandler.Handle(userPreferencesQuery, ct);

        var preferredLanguage = userPreferences.PreferredLanguage.ToDisplayName();

        AITimeEstimationResult? captured = null;

        [Description("Report the estimated time for the note")]
        void SetTimeEstimate(
            [Description("Duration in .NET TimeSpan 'c' format: hh:mm:ss")] string duration,
            [Description("False if the note is non-actionable gibberish")] bool isSuccess,
            [Description("Error message in the user's language if isSuccess is false, otherwise empty")] string errorMessage)
        {
            captured = new AITimeEstimationResult
            {
                Duration = isSuccess && TimeSpan.TryParse(duration, out var parsed) ? parsed : TimeSpan.Zero,
                IsSuccess = isSuccess,
                ErrorMessage = errorMessage
            };
        }

        try
        {
            var instructions = TaskTimeEstimatePrompts.GetTimeEstimatePrompt(preferredLanguage, request.Text);

            var agent = projectClient.AsAIAgent(
                model: _deploymentId,
                instructions: instructions,
                tools: [AIFunctionFactory.Create(SetTimeEstimate)]);

            logger.LogInformation("TimeEstimate: Invoking AI with deployment={DeploymentId}", _deploymentId);

            await agent.RunAsync("Estimate the time for this note.", cancellationToken: ct);

            if (captured == null)
            {
                logger.LogWarning("AI did not call SetTimeEstimate for note {NoteId}", request.NoteId);
                throw new AiTaskGenerationException(AiErrorCode.Unknown, "AI did not return a time estimate.");
            }

            logger.LogInformation("TimeEstimate result: {Duration}, success={IsSuccess}", captured.Duration, captured.IsSuccess);

            return captured;
        }
        catch (OperationCanceledException oce)
        {
            logger.LogWarning(oce, "Task time estimation was canceled");
            throw new AiTaskGenerationException(AiErrorCode.Canceled, "The request was canceled.", oce);
        }
        catch (Exception ex) when (
            ex.Message.Contains("429", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("quota", StringComparison.OrdinalIgnoreCase) ||
            ex.Message.Contains("token", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(ex, "Token limit exceeded during time estimation.");
            throw new AiTokenLimitedException();
        }
        catch (Exception ex) when (
            ex.Message.Contains("content_filter", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning(ex, "Request blocked by content filter during time estimation.");
            throw new AiContentFilterException();
        }
        catch (AiTaskGenerationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error during time estimation. NoteId: {NoteId}", request.NoteId);
            throw new AiTaskGenerationException(AiErrorCode.Unknown,
                "An unhandled exception occurred during task time estimate.", ex);
        }
    }
}

public class NoteTimeEstimation
{
    public Guid NoteId { get; set; }
    public TimeSpan Duration { get; set; }
}
