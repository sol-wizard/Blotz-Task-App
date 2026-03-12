using Microsoft.SemanticKernel;

namespace BlotzTask.Filters;

public class PromptRenderLoggingFilter(ILogger<PromptRenderLoggingFilter> logger)
    : IPromptRenderFilter
{
    public async Task OnPromptRenderAsync(
        PromptRenderContext context,
        Func<PromptRenderContext, Task> next)
    {
        await next(context);

        logger.LogDebug(
            "SK rendered prompt for {FunctionName}: {RenderedPrompt}",
            context.Function.Name,
            context.RenderedPrompt);
    }
}
