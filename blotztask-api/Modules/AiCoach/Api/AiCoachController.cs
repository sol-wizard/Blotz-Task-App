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
[ServiceFilter(typeof(ReviewListProtocolFilter))]
public class AiCoachController(
    StartConversationCommandHandler startConversation,
    SendMessageCommandHandler sendMessage,
    ConfirmDraftCommandHandler confirmDraft,
    RejectDraftCommandHandler rejectDraft,
    EditDraftCommandHandler editDraft,
    MessageFeedbackHandler messageFeedback,
    TranscribeAudioCommandHandler transcribeAudio,
    IConversationStore store, ChatApplication chat, ILogger<AiCoachController> logger) : ControllerBase
{
    [HttpGet("chat")]
    public async Task<ActionResult<ConversationSnapshotDto>> OpenChat([FromQuery] string timeZoneId, CancellationToken ct)
    {
        try { return Ok(await chat.OpenAsync(GetUserId(), timeZoneId, ct)); }
        catch (Exception ex) when (TryMapConversationError(ex, out var mapped)) { return mapped; }
    }

    [HttpGet("chat/messages")]
    public async Task<ActionResult<ChatTimelinePage>> GetMessages([FromQuery] string? before = null,
        [FromQuery] int limit = 30, CancellationToken ct = default)
    {
        try { return Ok(await chat.MessagesAsync(GetUserId(), before, limit, ct)); }
        catch (Exception ex) when (TryMapConversationError(ex, out var mapped)) { return mapped; }
    }

    [HttpPost("chat/topics")]
    public async Task<ActionResult<ConversationSnapshotDto>> NewTopic([FromBody] ChatTopicRequest request, CancellationToken ct)
    {
        try { return Ok(await chat.NewTopicAsync(GetUserId(), request.TimeZoneId, ct)); }
        catch (Exception ex) when (TryMapConversationError(ex, out var mapped)) { return mapped; }
    }

    [HttpDelete("chat")]
    public async Task<IActionResult> ClearChat(CancellationToken ct)
    {
        try { await chat.ClearAsync(GetUserId(), ct); return NoContent(); }
        catch (Exception ex) when (TryMapConversationError(ex, out var mapped)) { return mapped; }
    }
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
        if (conversation.EndedAt.HasValue)
            return Conflict(new { errorCode = "ConversationEnded", conversationSnapshot = ConversationSnapshotProjector.ToDto(conversation) });
        return Ok(ConversationSnapshotProjector.ToDto(conversation));
    }

    [HttpGet("conversations/{conversationId:guid}/message-feedback")]
    public async Task<ActionResult<IReadOnlyList<MessageFeedbackDto>>> GetMessageFeedback(
        Guid conversationId, CancellationToken ct)
    {
        try { return Ok(await messageFeedback.ListAsync(GetUserId(), conversationId, ct)); }
        catch (Exception ex) when (TryMapConversationError(ex, out var mapped)) { return mapped; }
    }

    [HttpPut("conversations/{conversationId:guid}/messages/{messageId:guid}/feedback")]
    public async Task<ActionResult<MessageFeedbackDto>> PutMessageFeedback(Guid conversationId,
        Guid messageId, [FromBody] MessageFeedbackRequest request, CancellationToken ct)
    {
        if (request.Rating is not ("up" or "down"))
            return BadRequest(new { errorCode = "InvalidRating" });
        try { return Ok(await messageFeedback.PutAsync(GetUserId(), conversationId, messageId, request, ct)); }
        catch (Exception ex) when (TryMapConversationError(ex, out var mapped)) { return mapped; }
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
        catch (Exception ex) when (TryMapConversationError(ex, out var mapped)) { return mapped; }
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
                TimeZoneId = request.TimeZoneId, Source = request.Source,
                ReviewListEnabled = Request.Headers[ReviewListProtocolFilter.HeaderName] == "6",
            }, ct);
            return Ok(dto);
        }
        catch (Exception ex) when (TryMapConversationError(ex, out var mapped))
        {
            return mapped;
        }
    }

    [HttpPost("conversations/{conversationId:guid}/messages/stream")]
    public async Task<IActionResult> StreamMessage(Guid conversationId, [FromBody] SendMessageRequest request,
        [FromServices] Microsoft.Extensions.Options.IOptions<JsonOptions> json,
        [FromServices] IHostApplicationLifetime lifetime, CancellationToken ct)
    {
        if (Request.Headers[ReviewListProtocolFilter.HeaderName] != "6")
            return BadRequest(new { errorCode = "ReviewListRequiresProtocol6" });
        var messageId = request.MessageId ?? Guid.NewGuid();
        await using var stream = new CoachEventStream(Response, conversationId, messageId, json.Value.JsonSerializerOptions, ct);
        try
        {
            // A dropped connection only ends the event stream. The turn keeps running (bounded by the
            // per-call model timeouts) and commits, so the client recovers the reply from the snapshot.
            var snapshot = await sendMessage.Handle(new SendMessageCommand
            {
                UserId = GetUserId(), ConversationId = conversationId, MessageId = messageId,
                Content = request.Content, ExpectedVersion = request.ExpectedVersion,
                TimeZoneId = request.TimeZoneId, Source = request.Source, ReviewListEnabled = true, Stream = stream.SendAsync,
            }, lifetime.ApplicationStopping);
            await stream.SendAsync(snapshot.GenerationError is null ? "turn.completed" : "turn.failed",
                new { conversationSnapshot = snapshot, errorCode = snapshot.GenerationError });
        }
        catch (Exception ex) when (!Response.HasStarted && TryMapConversationError(ex, out var mapped))
        {
            return mapped;
        }
        catch (Exception ex) when (Response.HasStarted)
        {
            // SendAsync is a no-op once the client has gone; the snapshot is the recovery path.
            logger.LogError(ex, "AiCoach stream failed for {ConversationId}", conversationId);
            await stream.SendAsync("turn.failed", new { errorCode = "stream_failed" });
        }
        return new EmptyResult();
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
            case ConversationEndedException ended:
                result = Conflict(new
                {
                    errorCode = "ConversationEnded",
                    conversationSnapshot = ConversationSnapshotProjector.ToDto(ended.Conversation),
                });
                return true;

            case ConversationNotFoundException:
                result = NotFound();
                return true;

            case System.ComponentModel.DataAnnotations.ValidationException validation:
                result = BadRequest(new { errorCode = "InvalidChatRequest", message = validation.Message });
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
