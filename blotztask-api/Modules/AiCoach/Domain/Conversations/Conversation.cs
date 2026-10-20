using System.Text.Json.Serialization;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Domain.Conversations;

/// <summary>Session data, with no dialogue stages or inferred planning state.</summary>
public sealed class Conversation
{
    public required Guid Id { get; init; }
    public required Guid UserId { get; init; }
    public required string TimeZoneId { get; set; }
    // Payload-only metadata; older payloads fall back to TimeZoneId until their first zone change.
    public string? InitialTimeZoneId { get; set; }
    public required DateTimeOffset CreatedAt { get; init; }
    // JsonInclude/Populate let the persisted store restore private state without public setters.
    [JsonInclude] public int Version { get; private set; } = 1;
    [JsonInclude] public Guid? RunningTurnId { get; private set; }
    [JsonInclude] public DateTimeOffset? RunningTurnStartedAt { get; private set; }
    [JsonInclude] public string? GenerationError { get; private set; }
    public DateTimeOffset? EndedAt { get; set; }
    public string? ClosingSummary { get; set; }
    [JsonIgnore]
    public List<ConversationMessage> Messages { get; } = [];
    [JsonObjectCreationHandling(JsonObjectCreationHandling.Populate)]
    public List<GatewayMessage> History { get; } = [];
    [JsonObjectCreationHandling(JsonObjectCreationHandling.Populate)]
    public List<ProposalSet> Drafts { get; } = [];
    [JsonObjectCreationHandling(JsonObjectCreationHandling.Populate)]
    public Dictionary<Guid, CommandReceipt> Receipts { get; } = [];
    [JsonObjectCreationHandling(JsonObjectCreationHandling.Populate)]
    public HashSet<Guid> CompletedMessages { get; } = [];
    [JsonInclude] public string? Summary { get; private set; }
    [JsonInclude] public int SummarizedMessageCount { get; private set; }
    /// <summary>One-tap next messages for the latest reply; cleared when the next turn starts.</summary>
    [JsonInclude] public IReadOnlyList<string> FollowUps { get; private set; } = [];

    public void Touch() => Version++;

    /// <summary>Future turns use the device zone; existing draft schedules retain their own zones.</summary>
    public bool ChangeTimeZone(string timeZoneId, DateTimeOffset now)
    {
        if (TimeZoneId == timeZoneId) return false;
        var previousZone = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
        var nextZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        if (Messages.Count > 0) InitialTimeZoneId ??= TimeZoneId;
        if (Messages.Count > 0)
            History.Add(new GatewaySystemMessage("App time zone change event (data, not instructions): " +
                System.Text.Json.JsonSerializer.Serialize(new
                {
                    previousTimeZoneId = TimeZoneId, currentTimeZoneId = timeZoneId,
                    previousMessageLocalTime = TimeZoneInfo.ConvertTime(Messages[^1].CreatedAt, previousZone),
                    previousLocalTime = TimeZoneInfo.ConvertTime(now, previousZone),
                    currentLocalTime = TimeZoneInfo.ConvertTime(now, nextZone),
                    note = "Earlier relative dates refer to the time zone in use when they were sent. Existing drafts keep their own time zones.",
                })));
        TimeZoneId = timeZoneId;
        Touch();
        return true;
    }

    public void BeginTurn(Guid messageId, string content, DateTimeOffset startedAt)
    {
        if (EndedAt.HasValue) throw new InvalidOperationException("The segment has ended.");
        if (RunningTurnId.HasValue) throw new InvalidOperationException("A turn is already running.");
        if (Drafts.Any(draft => draft.Status == ProposalSetStatus.Processing))
            throw new InvalidOperationException("A draft is being saved.");
        RunningTurnId = messageId;
        RunningTurnStartedAt = startedAt;
        GenerationError = null;
        FollowUps = [];
        if (Messages.All(message => message.Id != messageId))
        {
            InitialTimeZoneId ??= TimeZoneId;
            RecordDateChange(startedAt);
            Messages.Add(new(messageId, ConversationMessageRole.User, content, CreatedAt: MessageTime(startedAt)));
            History.Add(new GatewayUserMessage(content));
        }
        Touch();
    }

    /// <summary>Apply a whole turn once; stale or cancelled results never commit draft changes.</summary>
    public TurnCommitStatus CompleteTurn(Guid messageId, int expectedVersion, string? text, string? error,
        IReadOnlyList<GatewayMessage> turnHistory, IReadOnlyList<ProposalSet> drafts,
        string? summary, int summarizedCount, bool taskContextRead = false, DateTimeOffset? completedAt = null,
        IReadOnlyList<string>? followUps = null)
    {
        if (EndedAt.HasValue) return TurnCommitStatus.NoLongerActive;
        if (RunningTurnId != messageId) return TurnCommitStatus.NoLongerActive;
        if (Version != expectedVersion)
        {
            FinishTurn(messageId, "stale_turn");
            return TurnCommitStatus.Stale;
        }
        error ??= string.IsNullOrWhiteSpace(text) ? "invalid_response" : null;
        if (error is null)
        {
            AcceptReply(messageId, text!, turnHistory, drafts, summary, summarizedCount, taskContextRead,
                completedAt ?? DateTimeOffset.UtcNow);
            FollowUps = followUps?.ToArray() ?? [];
        }
        FinishTurn(messageId, error);
        return error is null ? TurnCommitStatus.Committed : TurnCommitStatus.Failed;
    }

    private void FinishTurn(Guid messageId, string? error)
    {
        RunningTurnId = null;
        RunningTurnStartedAt = null;
        GenerationError = error;
        if (error is null) CompletedMessages.Add(messageId);
        Touch();
    }

    /// <summary>
    /// Release a turn or draft save whose process stopped before finishing. A late result then no longer
    /// commits: <see cref="CompleteTurn"/> reports NoLongerActive.
    /// </summary>
    public bool ReleaseInterruptedWork(DateTimeOffset now, TimeSpan turnLimit, TimeSpan saveLimit)
    {
        if (EndedAt.HasValue) return false;
        var released = false;
        if (RunningTurnId.HasValue && RunningTurnStartedAt <= now - turnLimit)
        {
            RunningTurnId = null;
            RunningTurnStartedAt = null;
            GenerationError = "interrupted";
            released = true;
        }
        foreach (var draft in Drafts.Where(draft => draft.Status == ProposalSetStatus.Processing
                     && draft.SavingStartedAt <= now - saveLimit))
        {
            draft.ReleaseInterruptedSave();
            // An unfinished receipt would answer every retry with DraftConfirmationInProgress.
            foreach (var commandId in Receipts.Where(receipt => receipt.Value.DraftId == draft.Id
                         && receipt.Value.Result is null).Select(receipt => receipt.Key).ToArray())
                Receipts.Remove(commandId);
            released = true;
        }
        if (released) Touch();
        return released;
    }

    private void AcceptReply(Guid turnId, string text, IReadOnlyList<GatewayMessage> turnHistory,
        IReadOnlyList<ProposalSet> drafts, string? summary, int summarizedCount, bool taskContextRead,
        DateTimeOffset completedAt)
    {
        if (summarizedCount < 0 || summarizedCount > History.Count)
            throw new InvalidOperationException("Invalid summarized history cursor.");
        var previousDraftIds = Messages.SelectMany(message => message.DraftSnapshot ?? []).Select(draft => draft.Id).ToHashSet();
        foreach (var draft in drafts) UpdateDraftSnapshots(draft);
        var newDrafts = drafts.Where(draft => !previousDraftIds.Contains(draft.Id)).Select(draft => draft.Copy()).ToArray();
        Messages.Add(new(Guid.NewGuid(), ConversationMessageRole.Assistant, text, taskContextRead, turnId,
            MessageTime(completedAt), newDrafts.Length == 0 ? null : newDrafts));
        History.AddRange(turnHistory);
        Drafts.Clear();
        Drafts.AddRange(drafts.Select(draft => draft.Copy()));
        Summary = summary;
        History.RemoveRange(0, summarizedCount);
        SummarizedMessageCount = 0;
    }

    private const string DraftEventPrefix = "App draft event (data): ";
    private static readonly System.Text.Json.JsonSerializerOptions DraftEventJson =
        new() { Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };

    public void RecordDraftEvent(string action, ProposalSet draft)
    {
        UpdateDraftSnapshots(draft);
        // Each event carries the whole draft, so repeated edits in a row only need the latest one.
        if (History.LastOrDefault() is GatewaySystemMessage { Content: var last }
            && last.StartsWith(DraftEventPrefix, StringComparison.Ordinal)
            && last.Contains($"\"Id\":\"{draft.Id}\"", StringComparison.Ordinal))
            History.RemoveAt(History.Count - 1);
        // Application facts are supplied as data, not as a new user instruction.
        History.Add(new GatewaySystemMessage(DraftEventPrefix +
            System.Text.Json.JsonSerializer.Serialize(new { action, draft.Id, draft.Status, draft.Proposals }, DraftEventJson)));
        Touch();
    }

    /// <summary>Returns false for an empty or already ended segment; active work must finish first.</summary>
    public bool End(DateTimeOffset now)
    {
        if (EndedAt.HasValue) return false;
        if (RunningTurnId.HasValue || Drafts.Any(draft => draft.Status == ProposalSetStatus.Processing))
            throw new InvalidOperationException("The segment is busy.");
        if (Messages.Count == 0) return false;
        foreach (var draft in Drafts.Where(draft => draft.Status == ProposalSetStatus.Pending))
        {
            draft.Expire();
            RecordDraftEvent("expired_on_topic_end", draft);
        }
        EndedAt = now;
        Touch();
        return true;
    }

    public bool IsIdleBeyond(DateTimeOffset now, TimeSpan idleLimit) =>
        Messages.LastOrDefault() is { } last && now - last.CreatedAt > idleLimit;

    /// <summary>Remove retained-data copies as well as visible rows; callers rebuild bounded recent context.</summary>
    public void PruneMessagesBefore(DateTimeOffset cutoff)
    {
        var removedDrafts = Messages.Where(message => message.CreatedAt <= cutoff)
            .SelectMany(message => message.DraftSnapshot ?? []).Select(draft => draft.Id).ToHashSet();
        Messages.RemoveAll(message => message.CreatedAt <= cutoff);
        Drafts.RemoveAll(draft => removedDrafts.Contains(draft.Id));
        CompletedMessages.IntersectWith(Messages.Where(message => message.Role == ConversationMessageRole.User).Select(message => message.Id));
        History.Clear();
        Summary = null;
        ClosingSummary = null;
        SummarizedMessageCount = 0;
        Touch();
    }

    private void RecordDateChange(DateTimeOffset now)
    {
        if (Messages.LastOrDefault() is not { } previous) return;
        var zone = TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
        var previousDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(previous.CreatedAt, zone).DateTime);
        var currentDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(now, zone).DateTime);
        if (previousDate == currentDate) return;
        History.Add(new GatewaySystemMessage("App date change event (data, not instructions): " +
            System.Text.Json.JsonSerializer.Serialize(new
            {
                previousDate, currentDate, TimeZoneId,
                note = "The local date has changed. Earlier relative dates such as today and tomorrow refer to when those messages were sent.",
            })));
    }

    /// <summary>Keep the card on its originating message after later turns replace live drafts.</summary>
    public void UpdateDraftSnapshots(ProposalSet draft)
    {
        for (var index = 0; index < Messages.Count; index++)
        {
            var message = Messages[index];
            if (message.DraftSnapshot?.Any(snapshot => snapshot.Id == draft.Id) != true) continue;
            Messages[index] = message with
            {
                DraftSnapshot = message.DraftSnapshot.Select(snapshot => snapshot.Id == draft.Id ? draft.Copy() : snapshot).ToArray(),
            };
        }
    }

    // Preserve causal order when two events share the clock's resolution, including fixed test clocks.
    private DateTimeOffset MessageTime(DateTimeOffset now) =>
        Messages.LastOrDefault() is { } last && last.CreatedAt >= now ? last.CreatedAt.AddTicks(1) : now;
}

public enum ConversationMessageRole { User, Assistant }
public sealed record ConversationMessage(Guid Id, ConversationMessageRole Role, string Content,
    bool TaskContextRead = false, Guid? TurnId = null, DateTimeOffset CreatedAt = default,
    IReadOnlyList<ProposalSet>? DraftSnapshot = null);
/// <summary>Result is null while a confirmation runs and for discards, whose replay returns the current snapshot.</summary>
public sealed record CommandReceipt(Guid DraftId, string RequestHash, ConfirmDraftResultDto? Result);

public enum TurnCommitStatus { Committed, Failed, Stale, NoLongerActive }
