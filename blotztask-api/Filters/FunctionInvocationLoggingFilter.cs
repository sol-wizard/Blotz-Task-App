using System.Diagnostics;
using Microsoft.SemanticKernel;

namespace BlotzTask.Filters;

public class FunctionInvocationLoggingFilter(ILogger<FunctionInvocationLoggingFilter> logger)
    : IFunctionInvocationFilter
{
    public async Task OnFunctionInvocationAsync(
        FunctionInvocationContext context,
        Func<FunctionInvocationContext, Task> next)
    {
        var sw = Stopwatch.StartNew();
        logger.LogDebug("SK invoking {FunctionName}", context.Function.Name);

        try
        {
            await next(context);
            sw.Stop();

            object? usage = null;
            context.Result.Metadata?.TryGetValue("Usage", out usage);
            logger.LogInformation(
                "SK function {FunctionName} completed in {ElapsedMs}ms. Usage: {Usage}",
                context.Function.Name,
                sw.ElapsedMilliseconds,
                usage);
        }
        catch (Exception ex)
        {
            sw.Stop();
            logger.LogError(
                ex,
                "SK function {FunctionName} failed after {ElapsedMs}ms",
                context.Function.Name,
                sw.ElapsedMilliseconds);
            throw;
        }
    }
}
