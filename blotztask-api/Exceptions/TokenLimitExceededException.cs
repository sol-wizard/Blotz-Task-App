using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BlotzTask.Exceptions;

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