using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Application.Orchestration;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
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
        first.BeginTurn(Guid.NewGuid(), "First writer");
        second.BeginTurn(Guid.NewGuid(), "Second writer");
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
    public async Task Handle_InactiveBeyondRetention_IsNotReturned()
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
        found.Should().BeNull(because: "a conversation past its 30-day retention is no longer available");
    }

    [Fact]
    public async Task Handle_Save_UpdatesListColumnsAndRestoresAggregate()
    {
        // Arrange
        var store = Store();
        var conversation = await CreateAsync(store);
        var longMessage = new string('长', 40) + "\n second line";
        var turnId = Guid.NewGuid();
        conversation.BeginTurn(turnId, longMessage);
        conversation.CompleteTurn(turnId, conversation.Version, "Sure 👍", null, [], [], null, 0);
        // Act
        await store.SaveAsync(conversation, default);
        // Assert
        await using var db = new BlotzTaskDbContext(fixture.Options);
        var record = await db.AiCoachConversations.AsNoTracking().SingleAsync(x => x.Id == conversation.Id);
        record.Title.Should().Be(new string('长', 30) + "…", because: "the title is the first user message cut to 30 characters");
        record.LastMessagePreview.Should().Be("Sure 👍", because: "the preview is the latest message");
        record.MessageCount.Should().Be(2, because: "both the user and assistant messages count");
        record.Revision.Should().Be(2, because: "each save advances the concurrency token");
        var restored = await Store().FindAsync(conversation.Id, default);
        restored.Should().BeEquivalentTo(conversation, options => options.PreferringRuntimeMemberTypes(),
            because: "another process must read back the same conversation");
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
