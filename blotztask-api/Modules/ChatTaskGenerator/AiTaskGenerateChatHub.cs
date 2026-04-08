using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.Users.Queries;
using BlotzTask.Shared.Exceptions;
using Microsoft.Agents.AI;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.ChatTaskGenerator;

[Authorize]
public class AiTaskGenerateChatHub : Hub
{
    private readonly IAiTaskGenerateService _aiTaskGenerateService;
    private readonly DateTimeResolveService _dateTimeResolveService;
    private readonly GetUserPreferencesQueryHandler _getUserPreferencesQueryHandler;
    private readonly ILogger<AiTaskGenerateChatHub> _logger;
    private readonly SpeechTranscriptionService _speechTranscriptionService;

    public AiTaskGenerateChatHub(
        ILogger<AiTaskGenerateChatHub> logger,
        IAiTaskGenerateService aiTaskGenerateService,
        DateTimeResolveService dateTimeResolveService,
        GetUserPreferencesQueryHandler getUserPreferencesQueryHandler,
        SpeechTranscriptionService speechTranscriptionService)
    {
        _logger = logger;
        _aiTaskGenerateService = aiTaskGenerateService;
        _dateTimeResolveService = dateTimeResolveService;
        _getUserPreferencesQueryHandler = getUserPreferencesQueryHandler;
        _speechTranscriptionService = speechTranscriptionService;
    }

    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        if (httpContext?.Items.TryGetValue("UserId", out var userIdObj) != true || userIdObj is not Guid userId)
        {
            _logger.LogWarning("UserId not found in HttpContext.Items. ConnectionId: {ConnectionId}",
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
            _logger.LogWarning(ex, "Invalid time zone '{TimeZoneId}'. Using UTC.", timeZoneId);
        }

        var userPreferences = await _getUserPreferencesQueryHandler.Handle(
            new GetUserPreferencesQuery { UserId = userId },
            CancellationToken.None);

        var preferredLanguage = userPreferences.PreferredLanguage switch
        {
            Language.En => "English",
            Language.Zh => "Chinese (Simplified)",
            _ => "English"
        };

        Context.Items["TimeZone"] = timeZone;
        Context.Items["PreferredLanguage"] = preferredLanguage;
        Context.Items["Session"] = null;

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation(
            "User disconnected: {ConnectionId}. Exception: {Exception}",
            Context.ConnectionId, exception?.Message);

        Context.Items.Remove("Session");
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(string message)
    {
        var timeZone = Context.Items.TryGetValue("TimeZone", out var tzObj) && tzObj is TimeZoneInfo tz
            ? tz
            : TimeZoneInfo.Utc;

        var preferredLanguage = Context.Items.TryGetValue("PreferredLanguage", out var langObj) && langObj is string lang
            ? lang
            : "English";

        try
        {
            var ct = Context.ConnectionAborted;

            Context.Items.TryGetValue("Session", out var sessionObj);
            var session = sessionObj as AgentSession;

            var userLocalTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);

            var resolvedMessage = _dateTimeResolveService.Resolve(new ResolveDateTimesRequest
            {
                Message = message,
                TimeZone = timeZone
            });

            var (resultMessage, updatedSession) = await _aiTaskGenerateService.GenerateAiResponse(
                resolvedMessage, session, preferredLanguage, userLocalTime, ct);

            Context.Items["Session"] = updatedSession;

            await Clients.Caller.SendAsync("ReceiveMessage", resultMessage, ct);
        }
        catch (AiTaskGenerationException ex)
        {
            await Clients.Caller.SendAsync("ReceiveMessage", new AiGenerateMessage
            {
                IsSuccess = false,
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
                throw new HubException("Audio data is empty.");

            var formFile = new FormFile(
                new MemoryStream(audioData),
                0,
                audioData.Length,
                "audio",
                "audio.wav")
            {
                Headers = new HeaderDictionary(),
                ContentType = "audio/wav"
            };

            var transcript = await _speechTranscriptionService.TranscribeAsync(formFile, ct);
            await SendMessage(transcript);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "TranscribeAudio failed.");
            throw new HubException(ex.Message);
        }
    }
}
