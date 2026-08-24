using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BlotzTask.Modules.AiCoach.Api;

/// <summary>
/// AI Coach conversation endpoints.
///
/// TEMPORARY TRANSPORT (TS-005 substitute): the tech design specifies a SignalR hub with
/// snapshot push + reconnect semantics, but TS-005 is still 待补充. This controller serves the
/// SAME §18 response body over plain HTTP, so swapping to SignalR later changes the transport
/// only — no protocol change. Do not add transport-specific fields here.
/// </summary>
[ApiController]
[Route("api/ai-coach")]
[Authorize]
public class AiCoachController(
    StartConversationCommandHandler startConversation,
    SendMessageCommandHandler sendMessage,
    ConfirmDraftCommandHandler confirmDraft,
    RejectDraftCommandHandler rejectDraft,
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
        }, ct);
        return Ok(dto);
    }

    [HttpGet("conversations/{conversationId:guid}")]
    public async Task<ActionResult<ConversationSnapshotDto>> GetSnapshot(Guid conversationId, CancellationToken ct)
    {
        var conversation = await store.FindAsync(conversationId, ct);
        if (conversation is null || conversation.UserId != GetUserId())
            return NotFound();
        return Ok(ConversationSnapshotProjector.ToDto(conversation));
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

            // Recoverable dependency failure: draft stays retryable (§22.14 -> 503).
            return result.Status == "failed"
                ? StatusCode(StatusCodes.Status503ServiceUnavailable, result)
                : Ok(result);
        }
        catch (Exception ex) when (TryMapConversationError(ex, out var mapped))
        {
            return mapped;
        }
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

    /// <summary>Stable error mapping per §18/§22.14; conflict responses carry the latest snapshot.</summary>
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

            case ConversationRuleViolationException violation:
                result = Conflict(new
                {
                    errorCode = violation.Violation.ToString(),
                    conversationSnapshot = ConversationSnapshotProjector.ToDto(violation.Conversation),
                });
                return true;

            case DraftConflictException draftConflict:
                result = Conflict(new
                {
                    errorCode = draftConflict.ErrorCode,
                    conversationSnapshot = draftConflict.Snapshot,
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
