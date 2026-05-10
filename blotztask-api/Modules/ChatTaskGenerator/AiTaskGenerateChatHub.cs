using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.Users.Queries;
using BlotzTask.Shared.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.ChatTaskGenerator;

//so we need to update the onboarding documents

//TODO: Review the ADR (.ai/decisions/001-ai-task-generation.md) — verify decisions are still accurate and up to date.
[Authorize]
public class AiTaskGenerateChatHub(
    ILogger<AiTaskGenerateChatHub> logger,
    IAiChatService aiChatService,
    DateTimeResolveService dateTimeResolveService,
    GetUserPreferencesQueryHandler getUserPreferencesQueryHandler,
    SpeechTranscriptionService speechTranscriptionService) : Hub
{

    #region Connection Lifecycle

    public override async Task OnConnectedAsync()
    {
        var httpContext = GetHttpContextOrThrow();
        var userId = ExtractUserIdOrThrow(httpContext);
        var timeZone = ResolveTimeZone(httpContext);

        var userPreferences = await getUserPreferencesQueryHandler.Handle(
            new GetUserPreferencesQuery { UserId = userId }, CancellationToken.None);
        var preferredLanguage = userPreferences.PreferredLanguage.ToDisplayName();
        var chatContext = await aiChatService.InitializeAsync(preferredLanguage, timeZone, Context.ConnectionAborted);

        Context.Items["ChatContext"] = chatContext;
        Context.Items["UserId"] = userId;

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        logger.LogInformation(
            "User disconnected: {ConnectionId}. Exception: {Exception}",
            Context.ConnectionId, exception?.Message);

        Context.Items.Remove("ChatContext");
        await base.OnDisconnectedAsync(exception);
    }

    #endregion

    #region Hub Methods

    public async Task SendMessage(string message)
    {
        var chatContext = (AiChatContext)Context.Items["ChatContext"]!;
        var userId = (Guid)Context.Items["UserId"]!;
        var ct = Context.ConnectionAborted;

        // 1. Resolve any relative date/time references in the user's message (e.g. "tomorrow", "next Monday")
        var resolvedMessage = dateTimeResolveService.Resolve(new ResolveDateTimesRequest
        {
            Message = message,
            TimeZone = chatContext.TimeZone
        });

        // 2. Wire streaming callbacks so each tool call pushes items to the client in real time
        WireStreamingCallbacks(chatContext, ct);

        // 3. Run the AI — it will call tools (CreateTask, CreateNote, etc.) which trigger the callbacks above
        var resultMessage = await aiChatService.GenerateAiResponse(userId, resolvedMessage, chatContext, ct);

        // 4. Clear callbacks so stale tool calls from a previous turn cannot push to the client
        ClearStreamingCallbacks(chatContext);

        // 5. Stamp the original user message and send the authoritative final result for reconciliation
        resultMessage.UserInput = message;
        await Clients.Caller.SendAsync("ReceiveGenerationResult", resultMessage, ct);
    }

    public async Task TranscribeAudio(byte[] audioData)
    {
        var ct = Context.ConnectionAborted;

        if (audioData is null || audioData.Length == 0)
            throw new AiTaskGenerationException(AiErrorCode.EmptyAudio, "No audio was received.");

        await using var stream = new MemoryStream(audioData);
        var formFile = new FormFile(stream, 0, audioData.Length, "audio", "audio.m4a")
        {
            Headers = new HeaderDictionary(),
            ContentType = "audio/mp4"
        };

        var transcript = await speechTranscriptionService.TranscribeAsync(formFile, ct);
        await Clients.Caller.SendAsync("ReceiveTranscript", transcript, ct);
        await SendMessage(transcript);
    }

    #endregion

    #region Private Helpers

    private HttpContext GetHttpContextOrThrow()
    {
        return Context.GetHttpContext() ?? throw new HubException("UserId not found. Connection rejected.");
    }

    private static Guid ExtractUserIdOrThrow(HttpContext httpContext)
    {
        if (httpContext.Items.TryGetValue("UserId", out var userIdValue) && userIdValue is Guid userId)
            return userId;

        throw new HubException("UserId not found. Connection rejected.");
    }

    private TimeZoneInfo ResolveTimeZone(HttpContext httpContext)
    {
        // UTC is the safe default; the client passes a IANA/Windows timezone ID so we can
        // convert server-side UTC timestamps into the user's local time for AI context.
        var timeZoneId = httpContext.Request.Query["timeZone"].ToString();
        if (string.IsNullOrWhiteSpace(timeZoneId))
            return TimeZoneInfo.Utc;

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Invalid time zone '{TimeZoneId}'. Falling back to UTC.", timeZoneId);
            return TimeZoneInfo.Utc;
        }
    }

    private void WireStreamingCallbacks(AiChatContext chatContext, CancellationToken ct)
    {
        chatContext.Tools.OnTaskStreamed = async task =>
            await Clients.Caller.SendAsync("ReceiveTaskExtracted", task, ct);
        chatContext.Tools.OnNoteStreamed = async note =>
            await Clients.Caller.SendAsync("ReceiveNoteExtracted", note, ct);
    }

    private static void ClearStreamingCallbacks(AiChatContext chatContext)
    {
        chatContext.Tools.OnTaskStreamed = null;
        chatContext.Tools.OnNoteStreamed = null;
    }

    #endregion
}
