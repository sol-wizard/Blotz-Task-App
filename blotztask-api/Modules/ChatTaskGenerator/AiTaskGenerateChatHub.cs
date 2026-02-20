using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.Users.Queries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.ChatTaskGenerator;

[Authorize]
public class AiTaskGenerateChatHub : Hub
{
    private readonly IChatHistoryManagerService _chatHistoryManagerService;
    private readonly IChatToAiPipelineService _chatToAiPipelineService;
    private readonly ILogger<AiTaskGenerateChatHub> _logger;
    private readonly IRealtimeSpeechRecognitionService _realtimeSpeechRecognitionService;
    private readonly GetUserPreferencesQueryHandler _getUserPreferencesQueryHandler;


    public AiTaskGenerateChatHub(
        ILogger<AiTaskGenerateChatHub> logger,
        IChatHistoryManagerService chatHistoryManagerService,
        IChatToAiPipelineService chatToAiPipelineService,
        IRealtimeSpeechRecognitionService realtimeSpeechRecognitionService,
        GetUserPreferencesQueryHandler getUserPreferencesQueryHandler
    )
    {
        _logger = logger;
        _chatHistoryManagerService = chatHistoryManagerService;
        _chatToAiPipelineService = chatToAiPipelineService;
        _realtimeSpeechRecognitionService = realtimeSpeechRecognitionService;
        _getUserPreferencesQueryHandler = getUserPreferencesQueryHandler;
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


        var userLocalNow = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, timeZone);

        await _chatHistoryManagerService.InitializeNewConversation(userId, userLocalNow);
        var userPreferences = await _getUserPreferencesQueryHandler.Handle(
            new GetUserPreferencesQuery { UserId = userId },
            Context.ConnectionAborted);
        var initialLanguage = ToSpeechLanguageCode(userPreferences.PreferredLanguage);
        await _realtimeSpeechRecognitionService.StartSessionAsync(
            Context.ConnectionId,
            initialLanguage,
            Context.ConnectionAborted);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        _logger.LogInformation(
            $"User disconnected: {connectionId}. Exception: {exception?.Message}"
        );
        await _realtimeSpeechRecognitionService.StopSessionAsync(connectionId, Context.ConnectionAborted);
        _chatHistoryManagerService.RemoveConversation();
        await base.OnDisconnectedAsync(exception);
    }

    //TODO: Do we need this user paramter in this function? check and test frontend after clean up
    public async Task SendMessage(string user, string message)
    {
        await _chatToAiPipelineService.ProcessMessageAsync(
            Context.ConnectionId,
            message,
            Context.ConnectionAborted);
    }

    public async Task SendAudioChunk(PcmAudioChunk chunk)
    {
        await _realtimeSpeechRecognitionService.PushAudioChunkAsync(
            Context.ConnectionId,
            chunk,
            Context.ConnectionAborted);
    }

    private static string ToSpeechLanguageCode(Language preferredLanguage) =>
        preferredLanguage switch
        {
            Language.Zh => "zh-CN",
            _ => "en-US"
        };
}
