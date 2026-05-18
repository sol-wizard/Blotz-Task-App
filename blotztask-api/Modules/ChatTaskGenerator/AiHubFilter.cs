using BlotzTask.Modules.AiUsage.Exceptions;
using BlotzTask.Modules.ChatTaskGenerator.Dtos;
using BlotzTask.Shared.Exceptions;
using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Modules.ChatTaskGenerator;

// All hub method errors are sent to the caller via ReceiveGenerationError. If a new hub method
// needs a different error contract, handle it before reaching this filter.
public class AiHubFilter(ILogger<AiHubFilter> logger) : IHubFilter
{
    public async ValueTask<object?> InvokeMethodAsync(
        HubInvocationContext invocationContext,
        Func<HubInvocationContext, ValueTask<object?>> next)
    {
        try
        {
            return await next(invocationContext);
        }
        catch (AiTaskGenerationException ex)
        {
            logger.LogWarning(ex, "Hub method {Method} failed. ErrorCode: {Code}",
                invocationContext.HubMethodName, ex.Code);
            await invocationContext.Hub.Clients.Caller.SendAsync("ReceiveGenerationError", new AiGenerationError
            {
                ErrorCode = ex.Code.ToString(),
                ErrorMessage = ex.Message
            });
            return null;
        }
        catch (AiQuotaExceededException ex)
        {
            logger.LogWarning(ex, "Hub method {Method} failed: quota exceeded", invocationContext.HubMethodName);
            await invocationContext.Hub.Clients.Caller.SendAsync("ReceiveGenerationError", new AiGenerationError
            {
                ErrorCode = AiErrorCode.QuotaExceeded.ToString(),
                ErrorMessage = ex.Message
            });
            return null;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Hub method {Method} failed unexpectedly. ConnectionId: {ConnectionId}",
                invocationContext.HubMethodName, invocationContext.Context.ConnectionId);
            await invocationContext.Hub.Clients.Caller.SendAsync("ReceiveGenerationError", new AiGenerationError
            {
                ErrorCode = AiErrorCode.Unknown.ToString(),
                ErrorMessage = "An unexpected error occurred. Please try again."
            });
            return null;
        }
    }
}
