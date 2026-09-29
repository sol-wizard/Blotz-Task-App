using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.AiCoach.Api;

/// <summary>Session chat and independent editable task drafts.</summary>
[ApiController]
[Route("api/ai-coach")]
[Authorize]
public class AiCoachController(
    StartConversationCommandHandler startConversation,
    SendMessageCommandHandler sendMessage,
    ConfirmDraftCommandHandler confirmDraft,
    RejectDraftCommandHandler rejectDraft,
    EditDraftCommandHandler editDraft,
    MessageFeedbackHandler messageFeedback,
    TranscribeAudioCommandHandler transcribeAudio,
    IConversationStore store) : ControllerBase
{
    [HttpPost("conversations")]
    public async Task<ActionResult<ConversationSnapshotDto>> StartConversation(
        [FromBody] StartConversationRequest request, CancellationToken ct)
    {
        var dto = await startConversation.Handle(new StartConversationCommand
        {
            UserId = GetUserId(),
            TimeZoneId = request.TimeZoneId,
            Mode = request.Mode,
        }, ct);
        return Ok(dto);
    }

    [HttpGet("conversations/{conversationId:guid}")]
    public async Task<ActionResult<ConversationSnapshotDto>> GetSnapshot(Guid conversationId, CancellationToken ct)
    {
        using var held = await store.AcquireLockAsync(conversationId, ct);
        var conversation = await store.FindAsync(conversationId, ct);
        if (conversation is null || conversation.UserId != GetUserId())
            return NotFound();
        return Ok(ConversationSnapshotProjector.ToDto(conversation));
    }

    [HttpGet("conversations/{conversationId:guid}/message-feedback")]
    public async Task<ActionResult<IReadOnlyList<MessageFeedbackDto>>> GetMessageFeedback(
        Guid conversationId, CancellationToken ct)
    {
        try { return Ok(await messageFeedback.ListAsync(GetUserId(), conversationId, ct)); }
        catch (ConversationNotFoundException) { return NotFound(); }
    }

    [HttpPut("conversations/{conversationId:guid}/messages/{messageId:guid}/feedback")]
    public async Task<ActionResult<MessageFeedbackDto>> PutMessageFeedback(Guid conversationId,
        Guid messageId, [FromBody] MessageFeedbackRequest request, CancellationToken ct)
    {
        if (request.Rating is not ("up" or "down"))
            return BadRequest(new { errorCode = "InvalidRating" });
        try { return Ok(await messageFeedback.PutAsync(GetUserId(), conversationId, messageId, request, ct)); }
        catch (ConversationNotFoundException) { return NotFound(); }
    }

    [HttpDelete("conversations/{conversationId:guid}/messages/{messageId:guid}/feedback")]
    public async Task<IActionResult> DeleteMessageFeedback(Guid conversationId, Guid messageId,
        CancellationToken ct)
    {
        try
        {
            await messageFeedback.DeleteAsync(GetUserId(), conversationId, messageId, ct);
            return NoContent();
        }
        catch (ConversationNotFoundException) { return NotFound(); }
    }

    /// <summary>Voice input: transcribe a recording; the client puts the text into the input box.</summary>
    [HttpPost("transcribe")]
    public async Task<ActionResult<TranscriptionResultDto>> Transcribe(IFormFile audio, CancellationToken ct)
    {
        if (audio is null || audio.Length == 0)
            return BadRequest(new { errorCode = "EmptyAudio", message = "No audio was received." });

        return Ok(await transcribeAudio.Handle(audio, ct));
    }

    [HttpPost("conversations/{conversationId:guid}/messages")]
    public async Task<ActionResult<ConversationSnapshotDto>> SendMessage(
        Guid conversationId, [FromBody] SendMessageRequest request, CancellationToken ct)
    {
        try
        {
            var dto = await sendMessage.Handle(new SendMessageCommand
            {
                UserId = GetUserId(),
                ConversationId = conversationId,
                MessageId = request.MessageId ?? Guid.NewGuid(),
                Content = request.Content,
                ExpectedVersion = request.ExpectedVersion,
            }, ct);
            return Ok(dto);
        }
        catch (Exception ex) when (TryMapConversationError(ex, out var mapped))
        {
            return mapped;
        }
    }

    [HttpPost("conversations/{conversationId:guid}/drafts/{draftId:guid}/confirm")]
    public async Task<ActionResult<ConfirmDraftResultDto>> ConfirmDraft(
        Guid conversationId, Guid draftId, [FromBody] ConfirmDraftRequest request, CancellationToken ct)
    {
        try
        {
            var result = await confirmDraft.Handle(new ConfirmDraftCommand
            {
                UserId = GetUserId(),
                ConversationId = conversationId,
                DraftId = draftId,
                Request = request,
            }, ct);

            // A failed transaction leaves the draft editable and retryable.
            return result.Status == "failed"
                ? StatusCode(StatusCodes.Status503ServiceUnavailable, result)
                : Ok(result);
        }
        catch (Exception ex) when (TryMapConversationError(ex, out var mapped))
        {
            return mapped;
        }
    }

    [HttpPut("conversations/{conversationId:guid}/drafts/{draftId:guid}")]
    public async Task<ActionResult<ConversationSnapshotDto>> EditDraft(
        Guid conversationId, Guid draftId, [FromBody] EditDraftRequest request, CancellationToken ct)
    {
        try { return Ok(await editDraft.Handle(GetUserId(), conversationId, draftId, request, ct)); }
        catch (Exception ex) when (TryMapConversationError(ex, out var mapped)) { return mapped; }
    }

    [HttpPost("conversations/{conversationId:guid}/drafts/{draftId:guid}/reject")]
    public async Task<ActionResult<ConversationSnapshotDto>> RejectDraft(
        Guid conversationId, Guid draftId, [FromBody] RejectDraftRequest request, CancellationToken ct)
    {
        try
        {
            var dto = await rejectDraft.Handle(new RejectDraftCommand
            {
                UserId = GetUserId(),
                ConversationId = conversationId,
                DraftId = draftId,
                Request = request,
            }, ct);
            return Ok(dto);
        }
        catch (Exception ex) when (TryMapConversationError(ex, out var mapped))
        {
            return mapped;
        }
    }

    /// <summary>Conflict responses carry the latest snapshot for client reconciliation.</summary>
    private bool TryMapConversationError(Exception exception, out ActionResult result)
    {
        switch (exception)
        {
            case ConversationNotFoundException:
                result = NotFound();
                return true;

            case ConversationVersionConflictException conflict:
                result = Conflict(new
                {
                    errorCode = "StaleConversationVersion",
                    conversationSnapshot = ConversationSnapshotProjector.ToDto(conflict.Conversation),
                });
                return true;

            case DraftConflictException draftConflict:
                result = Conflict(new
                {
                    errorCode = draftConflict.ErrorCode,
                    conversationSnapshot = draftConflict.Snapshot,
                    scheduleAssessment = draftConflict.Assessment,
                });
                return true;

            case DraftFieldValidationException fieldError:
                result = UnprocessableEntity(new
                {
                    errorCode = fieldError.ErrorCode,
                    message = fieldError.Message,
                });
                return true;

            default:
                result = null!;
                return false;
        }
    }

    private Guid GetUserId()
    {
        if (!HttpContext.Items.TryGetValue("UserId", out var userIdObj) || userIdObj is not Guid userId)
            throw new UnauthorizedAccessException("Could not find valid user id from Http Context");
        return userId;
    }
}
