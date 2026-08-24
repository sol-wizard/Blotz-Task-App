using System.Globalization;
using BlotzTask.Modules.AiCoach.Domain.Artifacts;

namespace BlotzTask.Modules.AiCoach.Domain.Capabilities;

/// <summary>One task as the model proposes it. The time zone is NOT model-supplied; it comes from the conversation.</summary>
public sealed record CreateTaskDraftItemInput(
    string? Title,
    string? Description,
    string? Date,
    string? StartTime,
    string? EndTime,
    int? LabelId);

/// <summary>
/// Model-facing input contract for <c>draft.one_off.create</c>: one call proposes the whole
/// card (1..N one-off tasks). This type is the single source for the projected JSON tool schema
/// AND runtime validation (tech design §21.12) — the two can never drift because both derive
/// from here. Proposing N tasks in ONE call (rather than N calls) is what keeps the
/// one-artifact-per-turn invariant (§21.11 rule 4) untouched.
/// </summary>
public sealed record CreateTaskDraftsInput(IReadOnlyList<CreateTaskDraftItemInput>? Tasks);

public sealed record CreateTaskDraftsValidationError(
    CapabilityRejectionCode Code,
    string SafeMessageForModel);

/// <summary>
/// Handler for <c>draft.one_off.create</c> (ProposesArtifact semantics). It only validates and
/// returns a candidate payload for the current turn — it never saves an artifact, never touches
/// conversation state, and never creates a real task (tech design §21.7/§21.11).
/// </summary>
public sealed class CreateTaskDraftsHandler
{
    /// <summary>Schema 2: the card holds a list of items (schema 1 was a single task).</summary>
    public const int SchemaVersion = 2;
    public const int MaxTitleLength = 120;
    public const int MaxDurationMinutes = 12 * 60;

    /// <summary>
    /// Validates the raw model input and produces the strongly-typed draft payload.
    /// Missing required fields map to <see cref="CapabilityRejectionCode.MissingRequiredInformation"/>
    /// (§19.1 — the deterministic backstop when the model tries to draft without enough
    /// information); malformed values map to
    /// <see cref="CapabilityRejectionCode.SchemaValidationFailed"/> (correctable once, §21.11).
    /// The whole call is rejected if ANY item is invalid — the model fixes that one item and
    /// resubmits the full list; a half-validated card is never produced.
    /// </summary>
    public (TaskDraftPayload? Payload, CreateTaskDraftsValidationError? Error) Validate(
        CreateTaskDraftsInput input,
        string conversationTimeZoneId)
    {
        var tasks = input.Tasks;
        if (tasks is null || tasks.Count == 0)
        {
            return (null, new CreateTaskDraftsValidationError(
                CapabilityRejectionCode.MissingRequiredInformation,
                "tasks must contain at least one task. If you do not have a concrete task from the user, ask one clarifying question instead of creating a draft."));
        }

        if (tasks.Count > TaskDraftPayload.MaxItems)
        {
            return (null, new CreateTaskDraftsValidationError(
                CapabilityRejectionCode.SchemaValidationFailed,
                $"tasks may contain at most {TaskDraftPayload.MaxItems} tasks. Keep the {TaskDraftPayload.MaxItems} most important ones and tell the user the rest can be added afterwards."));
        }

        var items = new List<TaskDraftItem>(tasks.Count);
        for (var index = 0; index < tasks.Count; index++)
        {
            var (item, error) = ValidateItem(tasks[index], index, conversationTimeZoneId);
            if (error is not null)
                return (null, error);
            items.Add(item!);
        }

        return (new TaskDraftPayload(items), null);
    }

    private static (TaskDraftItem? Item, CreateTaskDraftsValidationError? Error) ValidateItem(
        CreateTaskDraftItemInput input,
        int index,
        string conversationTimeZoneId)
    {
        var at = $"tasks[{index}]";
        var title = input.Title?.Trim();
        if (string.IsNullOrEmpty(title)
            || string.IsNullOrWhiteSpace(input.Date)
            || string.IsNullOrWhiteSpace(input.StartTime)
            || string.IsNullOrWhiteSpace(input.EndTime))
        {
            return (null, new CreateTaskDraftsValidationError(
                CapabilityRejectionCode.MissingRequiredInformation,
                $"{at}: title, date, startTime and endTime are all required. If you do not have this information from the user, ask one clarifying question instead of creating a draft."));
        }

        if (title.Length > MaxTitleLength)
        {
            return (null, new CreateTaskDraftsValidationError(
                CapabilityRejectionCode.SchemaValidationFailed,
                $"{at}: title must be at most {MaxTitleLength} characters."));
        }

        if (!DateOnly.TryParseExact(input.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var date))
        {
            return (null, new CreateTaskDraftsValidationError(
                CapabilityRejectionCode.SchemaValidationFailed,
                $"{at}: date must use the format yyyy-MM-dd."));
        }

        if (!TryParseTime(input.StartTime, out var startTime)
            || !TryParseTime(input.EndTime, out var endTime))
        {
            return (null, new CreateTaskDraftsValidationError(
                CapabilityRejectionCode.SchemaValidationFailed,
                $"{at}: startTime and endTime must use the 24-hour format HH:mm."));
        }

        var duration = endTime.ToTimeSpan() - startTime.ToTimeSpan();
        if (duration <= TimeSpan.Zero)
        {
            return (null, new CreateTaskDraftsValidationError(
                CapabilityRejectionCode.SchemaValidationFailed,
                $"{at}: endTime must be after startTime on the same day."));
        }

        if (duration < TimeSpan.FromMinutes(1) || duration > TimeSpan.FromMinutes(MaxDurationMinutes))
        {
            return (null, new CreateTaskDraftsValidationError(
                CapabilityRejectionCode.SchemaValidationFailed,
                $"{at}: the task duration must be between 1 minute and {MaxDurationMinutes} minutes."));
        }

        var item = new TaskDraftItem(
            ItemId: Guid.NewGuid(),
            Title: title,
            Description: string.IsNullOrWhiteSpace(input.Description) ? null : input.Description.Trim(),
            Date: date,
            StartTime: startTime,
            EndTime: endTime,
            TimeZoneId: conversationTimeZoneId,
            LabelId: input.LabelId);

        return (item, null);
    }

    private static bool TryParseTime(string value, out TimeOnly time) =>
        TimeOnly.TryParseExact(value, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out time);
}
