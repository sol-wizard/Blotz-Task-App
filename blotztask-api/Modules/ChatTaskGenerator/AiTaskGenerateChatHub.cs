using BlotzTask.Modules.ChatTaskGenerator.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.ChatTaskGenerator;

[Authorize]
public class AiTaskGenerateChatHub : Hub
{
    private readonly IChatHistoryManagerService _chatHistoryManagerService;
    private readonly ILogger<AiTaskGenerateChatHub> _logger;
    private readonly IChatMessageProcessor _processor;

    public AiTaskGenerateChatHub(
        ILogger<AiTaskGenerateChatHub> logger,
        IChatHistoryManagerService chatHistoryManagerService,
        IChatMessageProcessor processor
    )
    {
        _logger = logger;
        _chatHistoryManagerService = chatHistoryManagerService;
        _processor = processor;
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
        var conversationId = httpContext?.Request.Query["conversationId"].ToString();
        try
        {
            if (!string.IsNullOrWhiteSpace(timeZoneId)) timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
            if (!string.IsNullOrWhiteSpace(conversationId))
                await Groups.AddToGroupAsync(Context.ConnectionId, conversationId);
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

    //TODO: Do we need this user paramter in this function? check and test frontend after clean up
    public async Task SendMessage(string user, string message)
    {
        var httpContext = Context.GetHttpContext();
        var conversationId = httpContext?.Request.Query["conversationId"].ToString();

        if (httpContext?.Items.TryGetValue("UserId", out var userIdObj) != true || userIdObj is not Guid userId)
            throw new HubException("UserId not found.");

        if (string.IsNullOrWhiteSpace(conversationId))
            throw new HubException("conversationId is required.");

        await _processor.ProcessUserTextAsync(userId, conversationId!, message, Context.ConnectionAborted);
    }

    public async Task GenerateFromHistory()
    {
        var httpContext = Context.GetHttpContext();
        var conversationId = httpContext?.Request.Query["conversationId"].ToString();

        if (string.IsNullOrWhiteSpace(conversationId))
            throw new HubException("conversationId is required.");

        await _processor.ProcessFromHistoryAsync(conversationId!, Context.ConnectionAborted);
    }
}
