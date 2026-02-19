using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Shared.Exceptions;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.ChatTaskGenerator.Services;

public interface IChatToAiPipelineService
{
    Task ProcessMessageAsync(string connectionId, string text, CancellationToken ct = default);
}

public sealed class ChatToAiPipelineService : IChatToAiPipelineService
{
    private readonly IHubContext<AiTaskGenerateChatHub> _hubContext;
    private readonly ILogger<ChatToAiPipelineService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    public ChatToAiPipelineService(
        IServiceScopeFactory scopeFactory,
        IHubContext<AiTaskGenerateChatHub> hubContext,
        ILogger<ChatToAiPipelineService> logger)
    {
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task ProcessMessageAsync(string connectionId, string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text)) return;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var chatHistoryManagerService = scope.ServiceProvider.GetRequiredService<IChatHistoryManagerService>();
            var aiTaskGenerateService = scope.ServiceProvider.GetRequiredService<IAiTaskGenerateService>();

            var chatHistory = chatHistoryManagerService.GetChatHistory();
            chatHistory.AddUserMessage(text);

            var resultMessage = await aiTaskGenerateService.GenerateAiResponse(ct);
            await _hubContext.Clients.Client(connectionId).SendAsync("ReceiveMessage", resultMessage, ct);
        }
        catch (AiTaskGenerationException ex)
        {
            var aiServiceError = new AiGenerateMessage
            {
                IsSuccess = false,
                ErrorMessage = ex.Message
            };

            await _hubContext.Clients.Client(connectionId).SendAsync("ReceiveMessage", aiServiceError, ct);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogInformation(
                ex,
                "Skipping speech message due to missing chat history. ConnectionId={ConnectionId}",
                connectionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed processing recognized speech message. ConnectionId={ConnectionId}",
                connectionId);
        }
    }
}