namespace BlotzTask.Modules.AiUsage.Exceptions;

public class AiQuotaExceededException : Exception
{
    public AiQuotaExceededException()
        : base("You have reached your monthly AI token limit.") { }

    public AiQuotaExceededException(string message)
        : base(message) { }
}
