namespace BlotzTask.Shared.Exceptions;

public class TokenLimitExceededException : Exception
{
    public TokenLimitExceededException()
        : base("We’ve hit a message size limit. Please try again later.")
    {
    }

    public TokenLimitExceededException(string message)
        : base(message)
    {
    }

    public TokenLimitExceededException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}