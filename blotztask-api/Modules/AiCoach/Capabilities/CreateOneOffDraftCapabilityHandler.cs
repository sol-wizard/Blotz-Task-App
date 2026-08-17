using BlotzTask.Modules.AiCoach.Domain;
using BlotzTask.Modules.AiCoach.ModelTurn;

namespace BlotzTask.Modules.AiCoach.Capabilities;

public sealed class CreateOneOffDraftCapabilityHandler
    : CapabilityHandler<CreateOneOffDraftCapabilityInput, CreateOneOffDraftCapabilityOutput>
{
    public override Task<CreateOneOffDraftCapabilityOutput> HandleAsync(
        CreateOneOffDraftCapabilityInput input,
        CapabilityExecutionContext context,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var title = input.Title?.Trim() ?? string.Empty;
        if (title.Length == 0)
            Reject("task_draft_title_required");
        if (title.Length > 300)
            Reject("task_draft_title_too_long");

        var description = string.IsNullOrWhiteSpace(input.Description)
            ? null
            : input.Description.Trim();
        if (description?.Length > 4_000)
            Reject("task_draft_description_too_long");

        var timeZoneId = input.TimeZoneId?.Trim() ?? string.Empty;
        var timeZone = ResolveTimeZone(timeZoneId);
        var startTimeUtc = ResolveLocal(input.Date, input.StartTime, timeZone);
        var endTimeUtc = ResolveLocal(input.Date, input.EndTime, timeZone);
        if (endTimeUtc <= startTimeUtc)
            Reject("task_draft_end_must_be_after_start");

        // Ownership and availability require the authenticated persistence context and are
        // intentionally revalidated before this candidate can become a stored artifact.
        if (input.LabelId is <= 0)
            Reject("invalid_task_draft_label_id");

        var artifactId = Guid.NewGuid();
        var detail = AiTaskDraftArtifact.CreateOneOff(
            artifactId,
            title,
            description,
            startTimeUtc,
            endTimeUtc,
            timeZoneId,
            input.Date,
            input.Date,
            input.LabelId);
        context.Proposals.Propose(new ProposedArtifactChange(
            artifactId,
            ArtifactType.TaskDraft,
            1,
            detail));

        return Task.FromResult(new CreateOneOffDraftCapabilityOutput(artifactId));
    }

    private static TimeZoneInfo ResolveTimeZone(string timeZoneId)
    {
        if (timeZoneId.Length == 0
            || timeZoneId.Length > 100
            || !TimeZoneInfo.TryConvertIanaIdToWindowsId(timeZoneId, out _))
            Reject("invalid_task_draft_time_zone");

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (Exception exception) when (exception is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            Reject("invalid_task_draft_time_zone");
            throw;
        }
    }

    private static DateTimeOffset ResolveLocal(
        DateOnly date,
        TimeOnly time,
        TimeZoneInfo timeZone)
    {
        var local = DateTime.SpecifyKind(date.ToDateTime(time), DateTimeKind.Unspecified);
        if (timeZone.IsInvalidTime(local) || timeZone.IsAmbiguousTime(local))
            Reject("invalid_task_draft_local_time");

        return new DateTimeOffset(local, timeZone.GetUtcOffset(local)).ToUniversalTime();
    }

    private static void Reject(string code) =>
        throw new CapabilityRejectedException(code, CapabilityIds.CreateOneOffDraft);
}

public sealed class OneOffTaskDraftResultValidator : ICapabilityResultValidator
{
    public ModelTurnValidationResult Validate(
        CapabilityDefinition definition,
        object result,
        ProposedArtifactChange? proposal,
        TurnView turn)
    {
        if (definition.Id != CapabilityIds.CreateOneOffDraft)
            return ModelTurnValidationResult.Allow;
        if (result is not CreateOneOffDraftCapabilityOutput output)
            return ModelTurnValidationResult.Reject("task_draft_output_invalid");
        if (proposal is null)
            return ModelTurnValidationResult.Reject("task_draft_proposal_missing");
        if (turn.BaseSnapshot.CurrentArtifact is not null)
            return ModelTurnValidationResult.Reject("pending_draft_already_exists");
        if (turn.ProposedArtifact is not null)
            return ModelTurnValidationResult.Reject("artifact_already_proposed_in_current_turn");
        if (proposal.Type != ArtifactType.TaskDraft)
            return ModelTurnValidationResult.Reject("task_draft_artifact_type_invalid");
        if (proposal.SchemaVersion != 1)
            return ModelTurnValidationResult.Reject("unsupported_task_draft_schema");
        if (proposal.Detail is not AiTaskDraftArtifact detail)
            return ModelTurnValidationResult.Reject("task_draft_detail_invalid");
        if (proposal.ArtifactId == Guid.Empty
            || output.ArtifactId != proposal.ArtifactId
            || detail.ArtifactId != proposal.ArtifactId)
            return ModelTurnValidationResult.Reject("task_draft_artifact_id_mismatch");
        if (string.IsNullOrWhiteSpace(detail.Title)
            || detail.Title != detail.Title.Trim()
            || detail.Title.Length > 300)
            return ModelTurnValidationResult.Reject("task_draft_title_invalid");
        if (detail.Description is not null
            && (detail.Description != detail.Description.Trim()
                || detail.Description.Length > 4_000))
            return ModelTurnValidationResult.Reject("task_draft_description_invalid");
        if (!IsValidTimeZone(detail.TimeZoneId))
            return ModelTurnValidationResult.Reject("invalid_task_draft_time_zone");
        if (detail.StartTimeUtc.Offset != TimeSpan.Zero
            || detail.EndTimeUtc.Offset != TimeSpan.Zero
            || detail.EndTimeUtc <= detail.StartTimeUtc)
            return ModelTurnValidationResult.Reject("task_draft_time_invalid");
        if (!LocalDatesMatch(detail))
            return ModelTurnValidationResult.Reject("task_draft_local_date_invalid");
        if (detail.LabelId is <= 0)
            return ModelTurnValidationResult.Reject("invalid_task_draft_label_id");
        return ModelTurnValidationResult.Allow;
    }

    private static bool IsValidTimeZone(string timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId)
            || timeZoneId != timeZoneId.Trim()
            || timeZoneId.Length > 100
            || !TimeZoneInfo.TryConvertIanaIdToWindowsId(timeZoneId, out _))
            return false;
        try
        {
            _ = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            return true;
        }
        catch (Exception exception) when (exception is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return false;
        }
    }

    private static bool LocalDatesMatch(AiTaskDraftArtifact detail)
    {
        try
        {
            var timeZone = TimeZoneInfo.FindSystemTimeZoneById(detail.TimeZoneId);
            return DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(detail.StartTimeUtc, timeZone).DateTime)
                    == detail.StartDateLocal
                && DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(detail.EndTimeUtc, timeZone).DateTime)
                    == detail.EndDateLocal;
        }
        catch (Exception exception) when (exception is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return false;
        }
    }
}
