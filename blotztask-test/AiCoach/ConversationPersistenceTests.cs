using BlotzTask.Modules.AiCoach.Ai.ModelGateway;
using BlotzTask.Modules.AiCoach.Application.Commands;
using BlotzTask.Modules.AiCoach.Application.Projections;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Modules.Tasks.Enums;
using FluentAssertions;

namespace BlotzTask.Tests.AiCoach;

public sealed class ConversationPersistenceTests
{
    [Fact]
    public void Handle_SerializeRoundTrip_RestoresWholeAggregate()
    {
        // Arrange
        var conversation = Populated();
        // Act
        var restored = ConversationSerializer.Deserialize(ConversationSerializer.Serialize(conversation));
        // Assert
        restored.Should().BeEquivalentTo(conversation, options => options.PreferringRuntimeMemberTypes(),
            because: "a restarted process must continue from exactly the stored conversation");
        restored.History.Select(message => message.GetType()).Should().Equal(
            conversation.History.Select(message => message.GetType()),
            because: "each history message must be restored as its own gateway type for the model call");
        restored.Version.Should().Be(conversation.Version, because: "optimistic version checks depend on the private version");
        restored.Drafts[0].Status.Should().Be(ProposalSetStatus.Completed, because: "a saved draft must not become editable again");
        restored.Receipts.Values.Should().ContainSingle(receipt => receipt.Result != null,
            because: "a confirmation replay must return its original result instead of saving again");
    }

    private static Conversation Populated()
    {
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Mode = AiCoachMode.Clarify,
            TimeZoneId = "Australia/Perth", CreatedAt = DateTimeOffset.UtcNow,
        };
        var turnId = Guid.NewGuid();
        conversation.BeginTurn(turnId, "Plan my week");
        var callId = Guid.NewGuid().ToString();
        var saved = new ProposalSet { Id = Guid.NewGuid() };
        var savedItem = new TaskProposal(Guid.NewGuid(), "Swim", null, new(2026, 10, 2), new(7, 0), new(8, 0),
            "Australia/Perth", 3, Recurrence: new(RecurrenceFrequency.Weekly, 1, 1, null, new(2026, 12, 31)));
        saved.Replace([savedItem]);
        saved.SetSchedule(new("partial", DateTimeOffset.UtcNow, [], null));
        saved.StartSaving();
        saved.RecordSaved(savedItem.ProposalId, 41, 7);
        saved.FinishSaving(null);
        var pending = new ProposalSet { Id = Guid.NewGuid() };
        pending.Replace([new(Guid.NewGuid(), "Read", "Chapter one", null, null, null, "Australia/Perth", null)]);
        conversation.CompleteTurn(turnId, conversation.Version, "Two drafts are ready.", null,
            [
                new GatewayAssistantMessage(null, [new(callId, "create_draft", "{\"items\":[]}")]),
                new GatewayToolResultMessage(callId, "{\"success\":true}"),
                new GatewayAssistantMessage("Two drafts are ready.", []),
            ],
            [saved, pending], "User plans the week.", 1, taskContextRead: true);
        conversation.RecordDraftEvent("saved", conversation.Drafts[0]);
        conversation.Receipts.Add(Guid.NewGuid(), new(pending.Id, "discard-hash", null));
        conversation.Receipts.Add(Guid.NewGuid(), new(saved.Id, "confirm-hash", new ConfirmDraftResultDto
        {
            CommandId = Guid.NewGuid(), Status = "succeeded",
            PersistedEntities = [new() { Kind = "recurring_task", Id = "41", SeriesId = "7" }],
            ConversationSnapshot = ConversationSnapshotProjector.ToDto(conversation),
        }));
        return conversation;
    }
}
