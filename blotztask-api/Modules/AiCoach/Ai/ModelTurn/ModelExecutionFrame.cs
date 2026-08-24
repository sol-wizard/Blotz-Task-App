using System.Globalization;
using BlotzTask.Modules.AiCoach.Domain.Artifacts;
using BlotzTask.Modules.AiCoach.Domain.Capabilities;
using BlotzTask.Modules.AiCoach.Domain.Conversations;

namespace BlotzTask.Modules.AiCoach.Ai.ModelTurn;

/// <summary>
/// Server-authoritative control projection sent to the model every iteration (tech design
/// §20.7). It restates the single narrow objective of the current turn, the current artifact,
/// allowed tools and hard invariants — so long tool loops cannot drift. Only the server builds
/// it; the model can never create or override it.
/// </summary>
public sealed record ModelExecutionFrame(
    int ExecutionFrameVersion,
    AiCoachMode Mode,
    ConversationState State,
    string TurnObjective,
    string? CurrentArtifactSummary,
    IReadOnlyList<string> AllowedToolNames,
    IReadOnlyList<string> Invariants,
    DateTimeOffset UserLocalNow,
    string TimeZoneId)
{
    /// <summary>Rendered as a control segment appended to the system prompt.</summary>
    public string Render()
    {
        var lines = new List<string>
        {
            "== Current turn (server-controlled) ==",
            $"User's local date/time: {UserLocalNow.ToString("dddd yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture)} ({TimeZoneId})",
            $"Turn objective: {TurnObjective}",
        };

        if (CurrentArtifactSummary is not null)
            lines.Add($"Current draft card: {CurrentArtifactSummary}");

        lines.Add(AllowedToolNames.Count > 0
            ? $"Tools available this turn: {string.Join(", ", AllowedToolNames)}"
            : "No tools are available this turn.");

        lines.AddRange(Invariants.Select(i => $"Hard rule: {i}"));
        return string.Join("\n", lines);
    }
}

public interface IModelExecutionFrameBuilder
{
    ModelExecutionFrame Build(
        ConversationSnapshot snapshot,
        TurnExecutionContext turn,
        IReadOnlyList<CapabilityDefinition> toolset,
        DateTimeOffset userLocalNow,
        string timeZoneId);
}

/// <summary>Execution-mode frame projection, version 2 (multi-task cards).</summary>
public sealed class ExecutionModeFrameBuilder : IModelExecutionFrameBuilder
{
    public ModelExecutionFrame Build(
        ConversationSnapshot snapshot,
        TurnExecutionContext turn,
        IReadOnlyList<CapabilityDefinition> toolset,
        DateTimeOffset userLocalNow,
        string timeZoneId)
    {
        // The TurnView (base snapshot + this turn's accepted proposals) drives the objective:
        // once a draft was proposed in this turn, the only remaining objective is to wrap up.
        var draftAlreadyProposed = turn.ProposedDraft is not null;
        var draftPendingOnScreen = snapshot.CurrentArtifact is
            { Status: ArtifactStatus.Pending or ArtifactStatus.Processing };

        var objective = (draftAlreadyProposed, draftPendingOnScreen, snapshot.State) switch
        {
            (true, _, _) when turn.ProposedDraft!.IsSingle =>
                "You already proposed the draft for this turn. Finish with one short reply stating the recommended time and its reason. Do not call any more tools.",
            (true, _, _) =>
                $"You already proposed the draft card ({turn.ProposedDraft!.Items.Count} tasks) for this turn. Finish with one or two short sentences summarizing the arrangement; do not list every field. Do not call any more tools.",
            (_, true, _) =>
                "A draft card is awaiting the user's decision. Reply briefly; do NOT create another draft.",
            (_, _, ConversationState.Clarifying) when snapshot.Clarification.RoundsAsked >= 2 =>
                "You have asked twice already. Stop asking; propose a conservative draft now (short block at the next sensible time) for whatever the user has named, unless the task itself is still completely unknown.",
            (_, _, ConversationState.Clarifying) =>
                "Read the user's answer. If it names concrete task(s) OR asks you to decide/list/plan them, create the draft card now (recommend times yourself). Only a pure goal with no delegation earns exactly one more core question - a new one, never a repeat of what you already asked.",
            _ =>
                "Understand what the user wants to do. If it is one or more concrete tasks, recommend a time for each (with a reason) and create the draft card in ONE tool call. If it is only a goal, ask exactly one question.",
        };

        var artifactSummary = snapshot.CurrentArtifact?.Payload is TaskDraftPayload draft
            ? string.Join("; ", draft.Items.Select(i =>
                  $"\"{i.Title}\" on {i.Date:yyyy-MM-dd} {i.StartTime:HH\\:mm}-{i.EndTime:HH\\:mm}"))
              + $" ({snapshot.CurrentArtifact.Status})"
            : null;

        return new ModelExecutionFrame(
            ExecutionFrameVersion: 2,
            Mode: snapshot.Mode,
            State: snapshot.State,
            TurnObjective: objective,
            CurrentArtifactSummary: artifactSummary,
            AllowedToolNames: draftAlreadyProposed || draftPendingOnScreen
                ? []
                : toolset.Select(t => t.ToolName).ToList(),
            Invariants:
            [
                "At most one draft card per turn (a card may hold several tasks); drafts are candidates, never saved tasks.",
                "Every concrete task the user named goes on the card - never drop one or ask the user to pick just one.",
                "Never invent a time silently - recommended times must be stated to the user with a reason.",
                "When information is missing, the entire reply is one single question.",
            ],
            UserLocalNow: userLocalNow,
            TimeZoneId: timeZoneId);
    }
}
