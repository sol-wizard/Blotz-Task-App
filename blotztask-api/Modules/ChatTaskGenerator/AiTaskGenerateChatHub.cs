using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Modules.AiUsage.Exceptions;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.Users.Queries;
using BlotzTask.Shared.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.ChatTaskGenerator;

//TODO: Remove the deployment id from the app settings , we only want to store that in the environment variable and the local development json 
//so we need to update the onboarding documents

//TODO: Review the ADR (.ai/decisions/001-ai-task-generation.md) — verify decisions are still accurate and up to date.
[Authorize]
public class AiTaskGenerateChatHub(
    ILogger<AiTaskGenerateChatHub> logger,
    IAiTaskGenerateService aiTaskGenerateService,
    DateTimeResolveService dateTimeResolveService,
    GetUserPreferencesQueryHandler getUserPreferencesQueryHandler,
    SpeechTranscriptionService speechTranscriptionService) : Hub
{

    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        var userId = httpContext?.Items["UserId"] as Guid?;
        if (userId is null)
        {
            logger.LogWarning("UserId not found in HttpContext.Items. ConnectionId: {ConnectionId}",
                Context.ConnectionId);
            throw new HubException("UserId not found in HttpContext. Connection rejected.");
        }

        //TODO: If this is a default please leave a comment so easier to read for later person, please double check why we need those timezone
        var timeZone = TimeZoneInfo.Utc;
        var timeZoneId = httpContext?.Request.Query["timeZone"].ToString();
        try
        {
            if (!string.IsNullOrWhiteSpace(timeZoneId)) timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Invalid time zone '{TimeZoneId}'. Using UTC.", timeZoneId);
        }

        var userPreferences = await getUserPreferencesQueryHandler.Handle(
            new GetUserPreferencesQuery { UserId = userId.Value },
            CancellationToken.None);
        var preferredLanguage = userPreferences.PreferredLanguage.ToDisplayName();

        var userLocalTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);

        var chatContext = await aiTaskGenerateService.InitializeAsync(preferredLanguage, userLocalTime, timeZone, Context.ConnectionAborted);

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

    public async Task SendMessage(string message)
    {
        var chatContext = (AiChatContext)Context.Items["ChatContext"]!;
        var userId = (Guid)Context.Items["UserId"]!;
        try
        {
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
            var resultMessage = await aiTaskGenerateService.GenerateAiResponse(userId, resolvedMessage, chatContext, ct);

            // 4. Clear callbacks so stale tool calls from a previous turn cannot push to the client
            ClearStreamingCallbacks(chatContext);

            // 5. Stamp the original user message and send the authoritative final result for reconciliation
            resultMessage.UserInput = message;
            await Clients.Caller.SendAsync("ReceiveGenerationResult", resultMessage, ct);
        }
        catch (AiQuotaExceededException ex)
        {
            await Clients.Caller.SendAsync("ReceiveGenerationResult", new AiGenerateMessage
            {
                IsSuccess = false,
                ErrorMessage = ex.Message
            });
        }
        catch (AiTaskGenerationException ex)
        {
            await Clients.Caller.SendAsync("ReceiveGenerationResult", new AiGenerateMessage
            {
                IsSuccess = false,
                ErrorCode = ex.Code.ToString(),
                ErrorMessage = ex.Message
            });
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

    public async Task TranscribeAudio(byte[] audioData)
    {
        var ct = Context.ConnectionAborted;

        try
        {
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
        catch (AiTaskGenerationException ex)
        {
            logger.LogError(ex, "TranscribeAudio failed. ErrorCode: {ErrorCode}", ex.Code);
            await Clients.Caller.SendAsync("ReceiveGenerationResult", new AiGenerateMessage
            {
                IsSuccess = false,
                ErrorCode = ex.Code.ToString(),
                ErrorMessage = ex.Message
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "TranscribeAudio failed with an unexpected error.");
            await Clients.Caller.SendAsync("ReceiveGenerationResult", new AiGenerateMessage
            {
                IsSuccess = false,
                ErrorCode = AiErrorCode.Unknown.ToString(),
                ErrorMessage = ex.Message
            });
        }
    }
}
