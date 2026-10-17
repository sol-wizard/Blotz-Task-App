using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.AiCoach.Domain.Proposals;
using BlotzTask.Modules.AiCoach.Infrastructure;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace BlotzTask.Tests.AiCoach;

public sealed class SqlConversationStoreTests(DatabaseFixture fixture) : IClassFixture<DatabaseFixture>
{
    [Fact]
    public async Task Handle_SaveAfterDelete_DoesNotRecreateConversation()
    {
        // Arrange
        var store = Store();
        var conversation = await CreateAsync(store);
        await using (var db = new BlotzTaskDbContext(fixture.Options))
            await db.AiCoachConversations.Where(x => x.Id == conversation.Id).ExecuteDeleteAsync();
        conversation.Touch();
        // Act
        var save = () => store.SaveAsync(conversation, default);
        // Assert
        await save.Should().ThrowAsync<ConversationNotFoundException>(because: "a late save must not bring back a deleted conversation");
        await using var check = new BlotzTaskDbContext(fixture.Options);
        (await check.AiCoachConversations.AnyAsync(x => x.Id == conversation.Id)).Should().BeFalse(
            because: "deletion is final for the user");
    }

    [Fact]
    public async Task Handle_TwoWritersFromSameRevision_RejectsSecond()
    {
        // Arrange
        var store = Store();
        var otherInstance = Store();
        var created = await CreateAsync(store);
        var first = (await store.FindAsync(created.Id, default))!;
        var second = (await otherInstance.FindAsync(created.Id, default))!;
        first.BeginTurn(Guid.NewGuid(), "First writer", DateTimeOffset.UtcNow);
        second.BeginTurn(Guid.NewGuid(), "Second writer", DateTimeOffset.UtcNow);
        await store.SaveAsync(first, default);
        // Act
        var save = () => otherInstance.SaveAsync(second, default);
        // Assert
        await save.Should().ThrowAsync<ConversationVersionConflictException>(
            because: "a writer on another instance must not overwrite a newer revision");
        var stored = await Store().FindAsync(created.Id, default);
        stored!.Messages.Should().ContainSingle(message => message.Content == "First writer",
            because: "the first committed write is kept");
    }

    [Fact]
    public async Task Handle_LongInactiveSegment_RemainsAvailableForIdleRollover()
    {
        // Arrange
        var store = Store();
        var conversation = await CreateAsync(store);
        await using (var db = new BlotzTaskDbContext(fixture.Options))
            await db.AiCoachConversations.Where(x => x.Id == conversation.Id)
                .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.LastActivityAt, DateTimeOffset.UtcNow.AddDays(-31)));
        // Act
        var found = await store.FindAsync(conversation.Id, default);
        // Assert
        found.Should().NotBeNull(because: "idle segments must remain loadable for rollover; retention applies to individual messages");
    }

    [Fact]
    public async Task Handle_Save_WritesMessagesAndRestoresAggregate()
    {
        // Arrange
        var store = Store();
        var conversation = await CreateAsync(store);
        var longMessage = new string('长', 40) + "\n second line";
        var turnId = Guid.NewGuid();
        conversation.BeginTurn(turnId, longMessage, DateTimeOffset.UtcNow);
        conversation.CompleteTurn(turnId, conversation.Version, "Sure 👍", null, [], [], null, 0);
        // Act
        await store.SaveAsync(conversation, default);
        // Assert
        await using var db = new BlotzTaskDbContext(fixture.Options);
        var record = await db.AiCoachConversations.AsNoTracking().SingleAsync(x => x.Id == conversation.Id);
        var messages = await db.AiCoachMessages.Where(x => x.ConversationId == conversation.Id)
            .OrderBy(x => x.CreatedAt).ToListAsync();
        messages.Select(x => x.Content).Should().Equal([longMessage, "Sure 👍"],
            because: "the visible timeline is stored independently of model working state");
        record.Payload.Should().NotContain("\"messages\":", because: "payload v2 must not duplicate visible messages");
        record.SchemaVersion.Should().Be(2, because: "the split storage format is version 2");
        record.MessageCount.Should().Be(2, because: "both the user and assistant messages count");
        record.Revision.Should().Be(2, because: "each save advances the concurrency token");
        var restored = await Store().FindAsync(conversation.Id, default);
        restored.Should().BeEquivalentTo(conversation, options => options.PreferringRuntimeMemberTypes(),
            because: "another process must read back the same conversation");
    }

    [Theory]
    [InlineData(13, false)]
    [InlineData(15, true)]
    public async Task Handle_TurnRunningPastModelBudget_IsReleasedOnLoad(int minutesAgo, bool released)
    {
        // Arrange
        var store = Store();
        var conversation = await CreateAsync(store);
        conversation.BeginTurn(Guid.NewGuid(), "Plan my day", DateTimeOffset.UtcNow.AddMinutes(-minutesAgo));
        await store.SaveAsync(conversation, default);
        // Act
        var loaded = await Store().FindAsync(conversation.Id, default);
        // Assert
        loaded!.RunningTurnId.HasValue.Should().Be(!released,
            because: "a turn is abandoned only after 60 s x 12 model calls + 2 minutes");
        loaded.GenerationError.Should().Be(released ? "interrupted" : null,
            because: "the client shows why the reply never arrived");
    }

    [Theory]
    [InlineData(4, false)]
    [InlineData(6, true)]
    public async Task Handle_SaveRunningPastFiveMinutes_ReturnsDraftToPending(int minutesAgo, bool released)
    {
        // Arrange
        var store = Store();
        var conversation = await CreateAsync(store);
        var turnId = Guid.NewGuid();
        conversation.BeginTurn(turnId, "Add a swim", DateTimeOffset.UtcNow);
        var draft = new ProposalSet { Id = Guid.NewGuid() };
        draft.Replace([new(Guid.NewGuid(), "Swim", null, null, null, null, "Australia/Perth", null)]);
        conversation.CompleteTurn(turnId, conversation.Version, "Draft ready.", null, [], [draft], null, 0);
        conversation.Drafts[0].StartSaving(DateTimeOffset.UtcNow.AddMinutes(-minutesAgo));
        conversation.Receipts.Add(Guid.NewGuid(), new(draft.Id, "confirm-hash", null));
        await store.SaveAsync(conversation, default);
        // Act
        var loaded = await Store().FindAsync(conversation.Id, default);
        // Assert
        loaded!.Drafts[0].Status.Should().Be(released ? ProposalSetStatus.Pending : ProposalSetStatus.Processing,
            because: "a save is abandoned only after five minutes");
        loaded.Drafts[0].SaveError.Should().Be(released ? "TaskPersistenceInterrupted" : null,
            because: "the draft card tells the user the save did not finish");
        loaded.Receipts.Should().HaveCount(released ? 0 : 1,
            because: "a leftover unfinished receipt would block every retry as already in progress");
    }

    [Fact]
    public async Task Handle_MessageInsertFails_RollsBackSegmentRevision()
    {
        // Arrange
        var store = Store();
        var first = await CreateAsync(store);
        var messageId = Guid.NewGuid();
        first.BeginTurn(messageId, "Existing message", DateTimeOffset.UtcNow);
        await store.SaveAsync(first, default);
        var second = await CreateAsync(store);
        second.BeginTurn(messageId, "Duplicate primary key", DateTimeOffset.UtcNow);
        // Act
        var save = () => store.SaveAsync(second, default);
        // Assert
        await save.Should().ThrowAsync<DbUpdateException>(because: "message IDs are globally unique");
        await using var db = new BlotzTaskDbContext(fixture.Options);
        var record = await db.AiCoachConversations.SingleAsync(x => x.Id == second.Id);
        record.Revision.Should().Be(1, because: "message failure must roll back the working-state update too");
        record.MessageCount.Should().Be(0, because: "a failed transaction cannot claim a visible message was saved");
        (await db.AiCoachMessages.AnyAsync(x => x.ConversationId == second.Id)).Should().BeFalse(
            because: "segment state and messages commit together");
    }

    [Fact]
    public async Task Handle_DraftChangesAfterAnotherTurn_UpdatesOriginalMessageCard()
    {
        // Arrange
        var store = Store();
        var conversation = await CreateAsync(store);
        var draft = new ProposalSet { Id = Guid.NewGuid() };
        draft.Replace([new(Guid.NewGuid(), "Swim", null, null, null, null, "Australia/Perth", null)]);
        var first = Guid.NewGuid();
        conversation.BeginTurn(first, "Draft a swim", DateTimeOffset.UtcNow);
        conversation.CompleteTurn(first, conversation.Version, "Draft ready", null, [], [draft], null, 0);
        await store.SaveAsync(conversation, default);
        var originalMessageId = conversation.Messages.Last().Id;
        var next = Guid.NewGuid();
        conversation.BeginTurn(next, "Thanks", DateTimeOffset.UtcNow);
        conversation.CompleteTurn(next, conversation.Version, "Welcome", null, [], conversation.Drafts.ToArray(), null, 0);
        conversation.Drafts[0].Discard();
        conversation.RecordDraftEvent("discarded_by_user", conversation.Drafts[0]);
        // Act
        await store.SaveAsync(conversation, default);
        var restored = (await Store().FindAsync(conversation.Id, default))!;
        // Assert
        restored.Messages.Single(x => x.Id == originalMessageId).DraftSnapshot!.Single().Status.Should()
            .Be(ProposalSetStatus.Rejected, because: "the original card reflects its latest status after later turns");
        restored.Messages.Last().DraftSnapshot.Should().BeNull(because: "later replies do not duplicate existing cards");
        restored.Messages.Should().HaveCount(4, because: "updating a snapshot must neither duplicate nor remove messages");
    }

    [Fact]
    public async Task Handle_OpenSegmentAlreadyExists_RejectsAnotherAndCascadesMessagesOnDelete()
    {
        // Arrange
        var store = Store();
        var first = await CreateAsync(store);
        first.BeginTurn(Guid.NewGuid(), "Keep this message", DateTimeOffset.UtcNow);
        await store.SaveAsync(first, default);
        var second = new Conversation
        {
            Id = Guid.NewGuid(), UserId = first.UserId, Mode = AiCoachMode.Unified,
            TimeZoneId = first.TimeZoneId, CreatedAt = DateTimeOffset.UtcNow,
        };
        // Act
        var create = () => store.CreateAsync(second, default);
        // Assert
        await create.Should().ThrowAsync<DbUpdateException>(because: "the filtered index permits only one open segment per user");
        first.EndedAt = DateTimeOffset.UtcNow;
        await store.SaveAsync(first, default);
        await store.CreateAsync(second, default);
        await using var db = new BlotzTaskDbContext(fixture.Options);
        (await db.AiCoachConversations.CountAsync(x => x.UserId == first.UserId)).Should().Be(2,
            because: "ended segments can coexist with one open segment");
        await db.AiCoachConversations.Where(x => x.Id == first.Id).ExecuteDeleteAsync();
        (await db.AiCoachMessages.AnyAsync(x => x.ConversationId == first.Id)).Should().BeFalse(
            because: "deleting a segment cascades to its visible messages");
    }

    [Fact]
    public async Task Handle_UnsupportedPayloadVersion_IsNotReturned()
    {
        // Arrange
        var store = Store();
        var conversation = await CreateAsync(store);
        await using var db = new BlotzTaskDbContext(fixture.Options);
        await db.AiCoachConversations.Where(x => x.Id == conversation.Id)
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.SchemaVersion, 1));
        // Act
        var found = await store.FindAsync(conversation.Id, default);
        // Assert
        found.Should().BeNull(because: "pre-release version 1 payloads must not be interpreted as version 2");
    }

    private SqlConversationStore Store()
    {
        var services = new ServiceCollection()
            .AddScoped(_ => new BlotzTaskDbContext(fixture.Options))
            .BuildServiceProvider();
        return new(services.GetRequiredService<IServiceScopeFactory>(), TimeProvider.System,
            Options.Create(new AiCoachModuleOptions()), NullLogger<SqlConversationStore>.Instance);
    }

    private async Task<Conversation> CreateAsync(IConversationStore store)
    {
        await using var db = new BlotzTaskDbContext(fixture.Options);
        var userId = await new DataSeeder(db).CreateUserAsync();
        var conversation = new Conversation
        {
            Id = Guid.NewGuid(), UserId = userId, Mode = AiCoachMode.Execution,
            TimeZoneId = "Australia/Perth", CreatedAt = DateTimeOffset.UtcNow,
        };
        await store.CreateAsync(conversation, default);
        return conversation;
    }
}
