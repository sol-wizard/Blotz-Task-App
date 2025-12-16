using BlotzTask.Modules.ChatTaskGenerator.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.ChatTaskGenerator;

[Authorize]
public class AiTaskGenerateChatHub : Hub
{
    private static CancellationTokenSource? _currentCancellationToken;
    private readonly IAiTaskGenerateService _aiTaskGenerateService;
    private readonly IChatHistoryManagerService _chatHistoryManagerService;
    private readonly ILogger<AiTaskGenerateChatHub> _logger;


    public AiTaskGenerateChatHub(
        ILogger<AiTaskGenerateChatHub> logger,
        IChatHistoryManagerService chatHistoryManagerService,
        IAiTaskGenerateService aiTaskGenerateService
    )
    {
        _logger = logger;
        _chatHistoryManagerService = chatHistoryManagerService;
        _aiTaskGenerateService = aiTaskGenerateService;
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
            timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Invalid time zone '{TimeZoneId}'. Using UTC.", timeZoneId);
        }


        var userLocalNow = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, timeZone);

        await _chatHistoryManagerService.InitializeNewConversation(userId, userLocalNow);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        _logger.LogInformation(
            $"User disconnected: {connectionId}. Exception: {exception?.Message}"
        );
        _chatHistoryManagerService.RemoveConversation();
        await base.OnDisconnectedAsync(exception);
    }

    public Task CancelGeneration()
    {
        _logger.LogInformation("CTS starts to cancel.");
        _logger.LogInformation(
            "CancelGeneration called. Conn={Conn}, CtsNull={IsNull}, CtsHash={CtsHash}, IsCanceled={IsCanceled}",
            Context.ConnectionId,
            _currentCancellationToken == null,
            _currentCancellationToken?.GetHashCode(),
            _currentCancellationToken?.IsCancellationRequested
        );
        if (_currentCancellationToken == null || _currentCancellationToken.IsCancellationRequested)
        {
            _logger.LogInformation("Ai generation doesn't exist or has been cancelled.");
            return Task.CompletedTask;
        }

        _currentCancellationToken.Cancel();
        return Task.CompletedTask;
    }

    public Task SendMessage(string user, string message)
    {
        _currentCancellationToken = CancellationTokenSource.CreateLinkedTokenSource(
            Context.ConnectionAborted
        );
        _logger.LogInformation(
            "CTS created. CTS.Hash={CtsHash}, Token.CanBeCanceled={CanBeCanceled}, Token.IsCancellationRequested={IsCanceled}, ConnectionId={ConnectionId}",
            _currentCancellationToken.GetHashCode(),
            _currentCancellationToken.Token.CanBeCanceled,
            _currentCancellationToken.Token.IsCancellationRequested,
            Context.ConnectionId
        );
        var chatHistory = _chatHistoryManagerService.GetChatHistory();
        chatHistory.AddUserMessage(message);
        _ = _aiTaskGenerateService.RunAsync(Context.ConnectionId, _currentCancellationToken.Token);

        return Task.CompletedTask;
    }
}