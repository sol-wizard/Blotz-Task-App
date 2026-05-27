using Microsoft.AspNetCore.SignalR;

namespace BlotzTask.Shared.Exceptions;

public enum AiErrorCode
{
    Unknown = 0,
    EmptyResponse = 1,
    InvalidJson = 2,
    TokenLimited = 3,
    BlockedByContentFilter = 4,
    Canceled = 5,
    TranscriptionFailed = 6,
    EmptyAudio = 7,
    NoTasksExtracted = 8,
    QuotaExceeded = 9,
    TranscriptionTimedOut = 10
}

public class AiTaskGenerationException : HubException
{
    public AiTaskGenerationException(AiErrorCode code, string message, Exception? inner = null)
        : base(message, inner)
    {
        Code = code;
    }

    public AiErrorCode Code { get; }
}

public sealed class AzureAiException
    : AiTaskGenerationException
{
    public AzureAiException(string message = "You have exceeded token rate limit of your current Azure OpenAI pricing tier.")
        : base(AiErrorCode.TokenLimited, message)
    {
    }
}

public sealed class AiContentFilterException
    : AiTaskGenerationException
{
    public AiContentFilterException(
        string message = "Your message triggered safety filters. Please rephrase and try again.")
        : base(AiErrorCode.BlockedByContentFilter, message)
    {
    }
}

public sealed class AiTranscriptionException
    : AiTaskGenerationException
{
    public AiTranscriptionException(string message = "Audio transcription failed.", Exception? inner = null)
        : base(AiErrorCode.TranscriptionFailed, message, inner)
    {
    }
}

public sealed class AiTranscriptionTimeoutException
    : AiTaskGenerationException
{
    public AiTranscriptionTimeoutException(Exception? inner = null)
        : base(AiErrorCode.TranscriptionTimedOut, "Audio transcription timed out. Please try again.", inner)
    {
    }
}
