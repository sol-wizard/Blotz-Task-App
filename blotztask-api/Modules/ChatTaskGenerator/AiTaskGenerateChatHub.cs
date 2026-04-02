using BlotzTask.Modules.ChatTaskGenerator.Constants;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Modules.SpeechToText.Services;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.Users.Queries;
using BlotzTask.Shared.Exceptions;
using BlotzTask.Shared.Store;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.ChatTaskGenerator;

[Authorize]
public class AiTaskGenerateChatHub : Hub
{
    private readonly IAiTaskGenerateService _aiTaskGenerateService;
    private readonly ChatHistoryStore _chatHistoryStore;
    private readonly DateTimeResolveService _dateTimeResolveService;
    private readonly GetUserPreferencesQueryHandler _getUserPreferencesQueryHandler;
    private readonly SpeechTranscriptionService _speechTranscriptionService;
    private readonly ILogger<AiTaskGenerateChatHub> _logger;

    public AiTaskGenerateChatHub(
        ILogger<AiTaskGenerateChatHub> logger,
        IAiTaskGenerateService aiTaskGenerateService,
        DateTimeResolveService dateTimeResolveService,
        ChatHistoryStore chatHistoryStore,
        GetUserPreferencesQueryHandler getUserPreferencesQueryHandler,
        SpeechTranscriptionService speechTranscriptionService)
    {
        _logger = logger;
        _aiTaskGenerateService = aiTaskGenerateService;
        _dateTimeResolveService = dateTimeResolveService;
        _chatHistoryStore = chatHistoryStore;
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

        Context.Items["TimeZone"] = timeZone;

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

        var chatHistory = _chatHistoryStore.GetOrCreate(Context.ConnectionId);
        chatHistory.AddSystemMessage(AiTaskGeneratorPrompts.GetSystemMessage(preferredLanguage, userLocalTime));

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogInformation(
            "User disconnected: {ConnectionId}. Exception: {Exception}",
            Context.ConnectionId, exception?.Message);

        _chatHistoryStore.Remove(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task SendMessage(string message)
    {
        var timeZone = Context.Items.TryGetValue("TimeZone", out var timeZoneObj) &&
                       timeZoneObj is TimeZoneInfo tz
            ? tz
            : TimeZoneInfo.Utc;

        try
        {
            var ct = Context.ConnectionAborted;

            if (!_chatHistoryStore.TryGet(Context.ConnectionId, out var chatHistory) || chatHistory == null)
                throw new HubException("Chat history not found for this connection.");

            var resolvedMessage = _dateTimeResolveService.Resolve(new ResolveDateTimesRequest
            {
                Message = message,
                TimeZone = timeZone
            });

            chatHistory.AddUserMessage(resolvedMessage);


            var resultMessage = await _aiTaskGenerateService.GenerateAiResponse(chatHistory, ct);
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

        var formFile = new FormFile(
            new MemoryStream(audioData),
            baseStreamOffset: 0,
            length: audioData.Length,
            name: "audio",
            fileName: "audio.wav")
        {
            Headers = new HeaderDictionary(),
            ContentType = "audio/wav"
        };

        var transcript = await _speechTranscriptionService.TranscribeAsync(formFile, ct);
        await Clients.Caller.SendAsync("ReceiveTranscription", transcript, ct);
    }
}