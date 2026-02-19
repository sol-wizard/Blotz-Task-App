using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Modules.ChatTaskGenerator.Services;
using BlotzTask.Shared.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.ChatTaskGenerator;

[Authorize]
public class AiTaskGenerateChatHub : Hub
{
    private readonly IAiTaskGenerateService _aiTaskGenerateService;
    private readonly IChatHistoryManagerService _chatHistoryManagerService;
    private readonly IRealtimeSpeechRecognitionService _realtimeSpeechRecognitionService;
    private readonly ILogger<AiTaskGenerateChatHub> _logger;


    public AiTaskGenerateChatHub(
        ILogger<AiTaskGenerateChatHub> logger,
        IChatHistoryManagerService chatHistoryManagerService,
        IAiTaskGenerateService aiTaskGenerateService,
        IRealtimeSpeechRecognitionService realtimeSpeechRecognitionService
    )
    {
        _logger = logger;
        _chatHistoryManagerService = chatHistoryManagerService;
        _aiTaskGenerateService = aiTaskGenerateService;
        _realtimeSpeechRecognitionService = realtimeSpeechRecognitionService;
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
        await _realtimeSpeechRecognitionService.StartSessionAsync(Context.ConnectionId, Context.ConnectionAborted);
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
        try
        {
            var ct = Context.ConnectionAborted;
            var chatHistory = _chatHistoryManagerService.GetChatHistory();

            chatHistory.AddUserMessage(message);
            var resultMessage = await _aiTaskGenerateService.GenerateAiResponse(ct);

            await Clients.Caller.SendAsync("ReceiveMessage", resultMessage, ct);
        }
        catch (AiTaskGenerationException ex)
        {
            var aiServiceError = new AiGenerateMessage
            {
                IsSuccess = false,
                ErrorMessage = ex.Message
            };
            await Clients.Caller.SendAsync("ReceiveMessage", aiServiceError);
        }
    }

    public async Task SendAudioChunk(PcmAudioChunk chunk)
    {
        await _realtimeSpeechRecognitionService.PushAudioChunkAsync(
            Context.ConnectionId,
            chunk,
            Context.ConnectionAborted);
    }
}
