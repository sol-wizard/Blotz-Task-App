using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>Session data, with no dialogue stages or inferred planning state.</summary>
public sealed class Conversation
{
    public required Guid Id { get; init; }
    public required Guid UserId { get; init; }
    public required AiCoachMode Mode { get; init; }
    public required string TimeZoneId { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset ExpiresAt { get; init; }
    public int Version { get; private set; } = 1;
    public Guid? RunningTurnId { get; private set; }
    public string? GenerationError { get; private set; }
    public List<ConversationMessage> Messages { get; } = [];
    public List<GatewayMessage> History { get; } = [];
    public List<ProposalSet> Drafts { get; } = [];
    public Dictionary<Guid, CommandReceipt> Receipts { get; } = [];
    public HashSet<Guid> CompletedMessages { get; } = [];
    public string? Summary { get; private set; }
    public int SummarizedMessageCount { get; private set; }

    public void Touch() => Version++;

    public void BeginTurn(Guid messageId, string content)
    {
        if (RunningTurnId.HasValue) throw new InvalidOperationException("A turn is already running.");
        if (Drafts.Any(draft => draft.Status == ProposalSetStatus.Processing))
            throw new InvalidOperationException("A draft is being saved.");
        RunningTurnId = messageId;
        GenerationError = null;
        if (Messages.All(message => message.Id != messageId))
        {
            Messages.Add(new(messageId, ConversationMessageRole.User, content));
            History.Add(new GatewayUserMessage(content));
        }
        Touch();
    }

    /// <summary>Apply a whole turn once; stale or cancelled results never commit draft changes.</summary>
    public TurnCommitStatus CompleteTurn(Guid messageId, int expectedVersion, string? text, string? error,
        IReadOnlyList<GatewayMessage> turnHistory, IReadOnlyList<ProposalSet> drafts,
        string? summary, int summarizedCount, bool taskContextRead = false)
    {
        if (RunningTurnId != messageId) return TurnCommitStatus.NoLongerActive;
        if (Version != expectedVersion)
        {
            FinishTurn(messageId, "stale_turn");
            return TurnCommitStatus.Stale;
        }
        error ??= string.IsNullOrWhiteSpace(text) ? "invalid_response" : null;
        if (error is null)
            AcceptReply(messageId, text!, turnHistory, drafts, summary, summarizedCount, taskContextRead);
        FinishTurn(messageId, error);
        return error is null ? TurnCommitStatus.Committed : TurnCommitStatus.Failed;
    }

    private void FinishTurn(Guid messageId, string? error)
    {
        RunningTurnId = null;
        GenerationError = error;
        if (error is null) CompletedMessages.Add(messageId);
        Touch();
    }

    private void AcceptReply(Guid turnId, string text, IReadOnlyList<GatewayMessage> turnHistory,
        IReadOnlyList<ProposalSet> drafts, string? summary, int summarizedCount, bool taskContextRead)
    {
        Messages.Add(new(Guid.NewGuid(), ConversationMessageRole.Assistant, text, taskContextRead, turnId));
        History.AddRange(turnHistory);
        Drafts.Clear();
        Drafts.AddRange(drafts.Select(draft => draft.Copy()));
        Summary = summary;
        SummarizedMessageCount = summarizedCount;
    }

    public void RecordDraftEvent(string action, ProposalSet draft)
    {
        // Application facts are supplied as data, not as a new user instruction.
        History.Add(new GatewaySystemMessage("App draft event (data): " +
            System.Text.Json.JsonSerializer.Serialize(new { action, draft.Id, draft.Status, draft.Proposals })));
        Touch();
    }
}

public enum ConversationMessageRole { User, Assistant }
public sealed record ConversationMessage(Guid Id, ConversationMessageRole Role, string Content,
    bool TaskContextRead = false, Guid? TurnId = null);
public sealed record CommandReceipt(Guid DraftId, string RequestHash, object? Result);

public enum TurnCommitStatus { Committed, Failed, Stale, NoLongerActive }
