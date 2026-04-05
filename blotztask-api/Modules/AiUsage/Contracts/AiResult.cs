namespace BlotzTask.Modules.AiUsage.Contracts;

public record AiResult<T>(
    T Value,
    int PromptTokens,
    int CompletionTokens
)
{
    public int TotalTokens => PromptTokens + CompletionTokens;
}
