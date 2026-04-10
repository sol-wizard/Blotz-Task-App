using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.Users.Queries;
using BlotzTask.Shared.Exceptions;
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

        var userLocalTime = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone);

        var chatContext = await _aiTaskGenerateService.InitializeAsync(preferredLanguage, userLocalTime, timeZone, CancellationToken.None);

        Context.Items["ChatContext"] = chatContext;

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation(
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

            var resolvedMessage = _dateTimeResolveService.Resolve(new ResolveDateTimesRequest
            {
                Message = message,
                TimeZone = chatContext.TimeZone
            });

            var resultMessage = await _aiTaskGenerateService.GenerateAiResponse(resolvedMessage, chatContext, ct);

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
