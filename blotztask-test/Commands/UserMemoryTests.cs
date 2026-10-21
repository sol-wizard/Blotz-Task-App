using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Users.Domain;
using BlotzTask.Modules.UserUnderstanding.Commands;
using BlotzTask.Modules.UserUnderstanding.Domain;
using BlotzTask.Modules.UserUnderstanding.Queries;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Commands;

public class UserMemoryTests : IClassFixture<DatabaseFixture>
{
    private static readonly DateTimeOffset Now = new(2026, 10, 20, 0, 0, 0, TimeSpan.Zero);

    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly RememberUserMemoryCommandHandler _remember;
    private readonly ForgetUserMemoryCommandHandler _forget;
    private readonly ClearUserMemoriesCommandHandler _clear;
    private readonly GetUserMemoriesQueryHandler _list;
    private readonly GetUserContextQueryHandler _userContext;

    public UserMemoryTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        var clock = new FixedClock();
        _remember = new RememberUserMemoryCommandHandler(_context, clock,
            TestDbContextFactory.CreateLogger<RememberUserMemoryCommandHandler>());
        _forget = new ForgetUserMemoryCommandHandler(_context, clock,
            TestDbContextFactory.CreateLogger<ForgetUserMemoryCommandHandler>());
        _clear = new ClearUserMemoriesCommandHandler(_context, clock,
            TestDbContextFactory.CreateLogger<ClearUserMemoriesCommandHandler>());
        _list = new GetUserMemoriesQueryHandler(_context, clock);
        _userContext = new GetUserContextQueryHandler(_context, clock);
    }

    private Task<RememberUserMemoryResult> RememberAsync(Guid userId, string content, string? replacesRef = null,
        DateTimeOffset? validUntil = null) =>
        _remember.Handle(new RememberUserMemoryCommand
        {
            UserId = userId, Kind = UserMemoryKind.Preference, Content = content,
            ReplacesRef = replacesRef, ValidUntil = validUntil,
        });

    [Fact]
    public async Task Handle_SameContentRememberedTwice_ConfirmsInsteadOfDuplicating()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        await RememberAsync(userId, "Keep replies short");

        // Act
        var second = await RememberAsync(userId, "  keep   REPLIES short ");

        // Assert
        second.AlreadyKnown.Should().BeTrue(because: "the same words in different case or spacing are the same memory");
        (await _list.Handle(new GetUserMemoriesQuery { UserId = userId })).Should().HaveCount(1,
            because: "repeating a memory confirms it rather than adding a copy");
    }

    [Fact]
    public async Task Handle_RememberWithReplaces_SupersedesTheOldMemory()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var old = (await RememberAsync(userId, "Works day shifts")).Memory!;

        // Act
        var result = await RememberAsync(userId, "Works night shifts", replacesRef: old.Ref);

        // Assert
        result.Success.Should().BeTrue(because: "a correction names an existing active memory");
        var stored = await _context.UserMemories.AsNoTracking().SingleAsync(m => m.Id == old.Id);
        stored.Status.Should().Be(UserMemoryStatus.Superseded, because: "a correction replaces the old fact");
        stored.SupersededById.Should().Be(result.Memory!.Id, because: "the change keeps a link to what replaced it");
        (await _list.Handle(new GetUserMemoriesQuery { UserId = userId })).Select(m => m.Content)
            .Should().Equal(["Works night shifts"], because: "only the corrected memory stays in effect");
    }

    [Fact]
    public async Task Handle_ActiveLimitReached_RejectsWithMemoryFull()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        for (var i = 0; i < UserMemory.MaxActivePerUser; i++) await RememberAsync(userId, $"Memory {i}");

        // Act
        var result = await RememberAsync(userId, "One too many");

        // Assert
        result.ErrorCode.Should().Be("memory_full", because: "explicit memories are never evicted silently");
    }

    [Fact]
    public async Task Handle_MemorySwitchedOff_RejectsAndHidesMemoriesFromContext()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        _context.UserPreferences.Add(new UserPreference { UserId = userId, AiMemoryEnabled = true });
        await _context.SaveChangesAsync();
        await RememberAsync(userId, "Keep replies short");
        var preference = await _context.UserPreferences.SingleAsync(p => p.UserId == userId);
        preference.AiMemoryEnabled = false;
        await _context.SaveChangesAsync();

        // Act
        var result = await RememberAsync(userId, "Plan mornings first");
        var context = await _userContext.Handle(new GetUserContextQuery { UserId = userId });

        // Assert
        result.ErrorCode.Should().Be("memory_disabled", because: "nothing is remembered while the user has memory off");
        (context ?? "").Should().NotContain("Keep replies short", because: "memories are not used while memory is off");
    }

    [Fact]
    public async Task Handle_Forget_KeepsOnlyATombstoneAndChangesTheStamp()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var memory = (await RememberAsync(userId, "Has class on Wednesday evenings")).Memory!;
        var stampBefore = await _userContext.GetMemoryStampAsync(userId);

        // Act
        var deleted = await _forget.Handle(new ForgetUserMemoryCommand { UserId = userId, Ref = memory.Ref });

        // Assert
        deleted.Should().BeTrue(because: "the ref names one active memory");
        var stored = await _context.UserMemories.AsNoTracking().SingleAsync(m => m.Id == memory.Id);
        stored.Status.Should().Be(UserMemoryStatus.Deleted, because: "a deleted memory stays as a tombstone");
        stored.Content.Should().BeEmpty(because: "the deleted words themselves are not kept");
        stored.ContentHash.Should().Be(RememberUserMemoryCommandHandler.Hash("Has class on Wednesday evenings"),
            because: "the hash lets later extraction recognise and skip the deleted memory");
        (await _userContext.Handle(new GetUserContextQuery { UserId = userId }) ?? "")
            .Should().NotContain("Wednesday", because: "a deleted memory is never shown to the model again");
        (await _userContext.GetMemoryStampAsync(userId)).Should().NotBe(stampBefore,
            because: "an open chat must rebuild its context on the next turn after a deletion");
    }

    [Fact]
    public async Task Handle_ExpiredMemory_IsNeitherListedNorUsed()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        _context.UserMemories.Add(new UserMemory
        {
            UserId = userId, Kind = UserMemoryKind.Constraint, Content = "Free evenings this week",
            ContentHash = RememberUserMemoryCommandHandler.Hash("Free evenings this week"),
            Source = UserMemorySource.Explicit, ValidUntil = Now.AddDays(-1),
            CreatedAt = Now.AddDays(-7), UpdatedAt = Now.AddDays(-7), LastConfirmedAt = Now.AddDays(-7),
        });
        await _context.SaveChangesAsync();

        // Act
        var listed = await _list.Handle(new GetUserMemoriesQuery { UserId = userId });
        var context = await _userContext.Handle(new GetUserContextQuery { UserId = userId });

        // Assert
        listed.Should().BeEmpty(because: "a 'this week only' memory stops applying after its end date");
        (context ?? "").Should().NotContain("Free evenings", because: "expired memories never reach the model");
    }

    [Fact]
    public async Task Handle_MemoryInEffect_AppearsInContextWithItsRef()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var memory = (await RememberAsync(userId, "Keep replies short")).Memory!;

        // Act
        var context = await _userContext.Handle(new GetUserContextQuery { UserId = userId });

        // Assert
        context.Should().Contain($"- [preference #{memory.Ref}] Keep replies short",
            because: "the model needs the ref to correct or forget the memory later");
    }

    [Fact]
    public async Task Handle_ClearAll_RemovesOnlyThisUsersMemories()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var otherUserId = await _seeder.CreateUserAsync();
        var forgotten = (await RememberAsync(userId, "Keep replies short")).Memory!;
        await _forget.Handle(new ForgetUserMemoryCommand { UserId = userId, MemoryId = forgotten.Id });
        await RememberAsync(userId, "Plan mornings first");
        await RememberAsync(otherUserId, "Keep replies short");

        // Act
        await _clear.Handle(new ClearUserMemoriesCommand { UserId = userId });

        // Assert
        (await _context.UserMemories.CountAsync(m => m.UserId == userId)).Should().Be(0,
            because: "'forget me' removes every row, tombstones included");
        (await _context.UserMemories.CountAsync(m => m.UserId == otherUserId)).Should().Be(1,
            because: "clearing is scoped to the signed-in user");
    }

    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }
}
