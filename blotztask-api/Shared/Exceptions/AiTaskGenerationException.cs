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
    NoTasksExtracted = 8
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

public sealed class AiEmptyResponseException
    : AiTaskGenerationException
{
    public AiEmptyResponseException(string message = "AI response content is empty.")
        : base(AiErrorCode.EmptyResponse, message)
    {
    }
}

public sealed class AiInvalidJsonException
    : AiTaskGenerationException
{
    public AiInvalidJsonException(string content, Exception? inner = null)
        : base(AiErrorCode.InvalidJson, "AI returned invalid JSON format.", inner)
    {
    }
}

public sealed class AiTokenLimitedException
    : AiTaskGenerationException
{
    public AiTokenLimitedException(string message = "You have exceeded token rate limit of your current Azure OpenAI pricing tier.")
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
