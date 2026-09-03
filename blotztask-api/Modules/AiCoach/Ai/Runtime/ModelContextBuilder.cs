using System.Globalization;
using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Ai.Prompts;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Modes;
using BlotzTask.Modules.AiCoach.Domain.Policy;
using BlotzTask.Modules.AiCoach.Domain.Proposals;

namespace BlotzTask.Modules.AiCoach.Ai.Runtime;

/// <summary>
/// Deterministic, server-side Model Context assembly (v3 tech design §9): versioned prompt
/// modules (static prefix + dynamic suffix) plus the rendered Execution Frame — the
/// server-authoritative control block restating this turn's objective, allowed strategies,
/// current card and hard invariants. Only the server builds it; the model can never override it.
/// </summary>
public interface IModelContextBuilder
{
    ModelContext Build(ModelContextRequest request);
}

public sealed record ModelContextRequest(
    ConversationSnapshot Snapshot,
    AiCoachModeDefinition Mode,
    StrategyEnvelope Envelope,
    IReadOnlyList<ConversationMessage> RecentMessages,
    string TimeZoneId,
    DateTimeOffset UserLocalNow);

public sealed record ModelContext(
    string SystemPrompt,
    IReadOnlyList<GatewayMessage> Transcript,
    PromptManifest Manifest);

public sealed class ModelContextBuilder(IModelPromptAssembler promptAssembler) : IModelContextBuilder
{
    public ModelContext Build(ModelContextRequest request)
    {
        var prompt = promptAssembler.Assemble(new PromptAssemblyRequest(
            request.Mode.PromptVersion, request.Snapshot.Mode, request.Snapshot.Phase));

        var frame = RenderFrame(request);

        var systemPrompt = string.Join(
            "\n\n",
            new[] { prompt.StaticPrefix, prompt.DynamicSuffix, frame }
                .Where(s => !string.IsNullOrWhiteSpace(s)));

        var transcript = new List<GatewayMessage>(request.RecentMessages.Count);
        foreach (var message in request.RecentMessages)
        {
            transcript.Add(message.Role == ConversationMessageRole.User
                ? new GatewayUserMessage(message.Content)
                : new GatewayAssistantMessage(message.Content, []));
        }

        return new ModelContext(systemPrompt, transcript, prompt.Manifest);
    }

    private static string RenderFrame(ModelContextRequest request)
    {
        var snapshot = request.Snapshot;
        var envelope = request.Envelope;

        var lines = new List<string>
        {
            "== Current turn (server-controlled) ==",
            $"User's local date/time: {request.UserLocalNow.ToString("dddd yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture)} ({request.TimeZoneId})",
            $"Turn objective: {envelope.TurnObjective}",
            "Strategies allowed this turn: "
                + string.Join(", ", envelope.AllowedStrategies
                    .OrderBy(s => (int)s)
                    .Select(s => s.ToWireValue())),
        };

        if (snapshot.CurrentProposalSet is { } set && set.IsOpen)
        {
            var summary = string.Join("; ", set.Proposals.Select(p =>
                $"\"{p.Title}\" on {p.Date:yyyy-MM-dd} {p.StartTime:HH\\:mm}-{p.EndTime:HH\\:mm}"));
            lines.Add($"Current draft card: {summary} ({set.Status})");
        }

        if (snapshot.ActivePlanningIntent is { Items.Count: > 0 } intent)
        {
            lines.Add("Active user-verified planning intent: "
                      + string.Join(", ", intent.Items.Select(item => $"\"{item.Text}\"")));
            if (intent.Constraints.Count > 0)
            {
                lines.Add("Active user-verified constraints: "
                          + string.Join(", ", intent.Constraints.Select(constraint => $"\"{constraint.Text}\"")));
            }
            if (intent.AskedTopics is { Count: > 0 })
                lines.Add("Clarification slots already used: " + string.Join(", ", intent.AskedTopics));
        }

        if (snapshot.OpenQuestion is { } question)
            lines.Add($"Your open question about {question.Topic} (asked {question.RoundsAsked}x): "
                      + $"\"{question.Question}\". This slot is spent: do not repeat or replace it with another question; "
                      + "use the answer or a safe default.");

        lines.AddRange(new[]
        {
            "Hard rule: At most one draft card per turn (a card may hold several tasks); proposals are candidates, never saved tasks.",
            "Hard rule: Every concrete task the user named goes on the card - never drop one or ask the user to pick just one.",
            "Hard rule: Never invent a time silently - recommended times must be stated to the user with a reason.",
            "Hard rule: When information is missing, the entire reply is one single question.",
        });

        return string.Join("\n", lines);
    }
}
