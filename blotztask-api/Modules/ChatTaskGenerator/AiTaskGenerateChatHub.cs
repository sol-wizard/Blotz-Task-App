using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.Users.Queries;
using BlotzTask.Shared.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.ChatTaskGenerator;

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
        if (httpContext?.Items.TryGetValue("UserId", out var userIdObj) != true || userIdObj is not Guid userId)
        {
            logger.LogWarning("UserId not found in HttpContext.Items. ConnectionId: {ConnectionId}",
                Context.ConnectionId);
            throw new HubException("UserId not found in HttpContext. Connection rejected.");
        }

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
            new GetUserPreferencesQuery { UserId = userId },
            CancellationToken.None);

        var preferredLanguage = userPreferences.PreferredLanguage.ToDisplayName();

        var userLocalTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);

        var chatContext = await aiTaskGenerateService.InitializeAsync(preferredLanguage, userLocalTime, timeZone, Context.ConnectionAborted);

        Context.Items["ChatContext"] = chatContext;

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

        try
        {
            var ct = Context.ConnectionAborted;

            var resolvedMessage = dateTimeResolveService.Resolve(new ResolveDateTimesRequest
            {
                Message = message,
                TimeZone = chatContext.TimeZone
            });
            
            var resultMessage = await aiTaskGenerateService.GenerateAiResponse(resolvedMessage, chatContext, ct);
            resultMessage.UserInput = message;

            await Clients.Caller.SendAsync("ReceiveMessage", resultMessage, ct);
        }
        catch (AiTaskGenerationException ex)
        {
            await Clients.Caller.SendAsync("ReceiveMessage", new AiGenerateMessage
            {
                IsSuccess = false,
                ErrorCode = ex.Code.ToString(),
                ErrorMessage = ex.Message
            });
        }
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
            await SendMessage(transcript);
        }
        catch (AiTaskGenerationException ex)
        {
            logger.LogError(ex, "TranscribeAudio failed. ErrorCode: {ErrorCode}", ex.Code);
            await Clients.Caller.SendAsync("ReceiveMessage", new AiGenerateMessage
            {
                IsSuccess = false,
                ErrorCode = ex.Code.ToString(),
                ErrorMessage = ex.Message
            });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "TranscribeAudio failed with an unexpected error.");
            await Clients.Caller.SendAsync("ReceiveMessage", new AiGenerateMessage
            {
                IsSuccess = false,
                ErrorCode = AiErrorCode.Unknown.ToString(),
                ErrorMessage = ex.Message
            });
        }
    }
}
