using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiCoach.Domain.Conversations;
using BlotzTask.Modules.Users.Commands;
using BlotzTask.Modules.Users.Domain;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Tests.Commands;

public class UpdateUserPreferenceTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly UpdateUserPreferenceCommandHandler _handler;

    public UpdateUserPreferenceTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _handler = new UpdateUserPreferenceCommandHandler(_context, TimeProvider.System,
            TestDbContextFactory.CreateLogger<UpdateUserPreferenceCommandHandler>());
    }

    // Reminders start on, the same as for every new user.
    private async Task<Guid> CreateUserWithRemindersOnAsync()
    {
        var userId = await _seeder.CreateUserAsync();
        _context.UserPreferences.Add(new UserPreference { UserId = userId });
        await _context.SaveChangesAsync();
        return userId;
    }

    private Task<bool> StoredReviewNotificationAsync(Guid userId) =>
        _context.UserPreferences.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.ReviewNotification)
            .SingleAsync();

    [Fact]
    public async Task Handle_ReviewNotificationOmitted_KeepsStoredValue()
    {
        // Arrange
        var userId = await CreateUserWithRemindersOnAsync();

        // Act
        await _handler.Handle(new UpdateUserPreferenceCommand
        {
            UserId = userId,
            UserPreferences = new UpdateUserPreferenceDto { AutoRollover = false },
        });

        // Assert
        (await StoredReviewNotificationAsync(userId)).Should().BeTrue(
            because: "older app versions save every setting without this field, and that must not turn reminders off");
    }

    [Fact]
    public async Task Handle_ReviewNotificationFalse_TurnsRemindersOff()
    {
        // Arrange
        var userId = await CreateUserWithRemindersOnAsync();

        // Act
        await _handler.Handle(new UpdateUserPreferenceCommand
        {
            UserId = userId,
            UserPreferences = new UpdateUserPreferenceDto { ReviewNotification = false },
        });

        // Assert
        (await StoredReviewNotificationAsync(userId)).Should().BeFalse(
            because: "a client that sends the field is saying what the user chose");
    }

    private async Task<Guid> CreateUserWithMemoryAsync(bool enabled)
    {
        var userId = await _seeder.CreateUserAsync();
        _context.UserPreferences.Add(new UserPreference { UserId = userId, AiMemoryEnabled = enabled });
        await _context.SaveChangesAsync();
        return userId;
    }

    private async Task<Guid> CreateConversationAsync(Guid userId, DateTimeOffset memoryProcessedAt,
        DateTimeOffset? endedAt = null, string? closingSummary = null)
    {
        var record = new AiCoachConversationRecord
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            MessageCount = 1,
            EndedAt = endedAt,
            ClosingSummary = closingSummary,
            MemoryProcessedAt = memoryProcessedAt,
            CreatedAt = memoryProcessedAt,
            LastActivityAt = memoryProcessedAt,
            Revision = 1,
            Payload = "{}",
        };
        _context.AiCoachConversations.Add(record);
        await _context.SaveChangesAsync();
        return record.Id;
    }

    private Task<AiCoachConversationRecord> StoredConversationAsync(Guid id) =>
        _context.AiCoachConversations.AsNoTracking().SingleAsync(c => c.Id == id);

    private Task SetMemoryAsync(Guid userId, bool enabled) => _handler.Handle(new UpdateUserPreferenceCommand
    {
        UserId = userId,
        UserPreferences = new UpdateUserPreferenceDto { AiMemoryEnabled = enabled },
    });

    [Fact]
    public async Task Handle_MemoryTurnedBackOn_SkipsWhatWasSaidWhileOff()
    {
        // Arrange
        var userId = await CreateUserWithMemoryAsync(enabled: false);
        var openTopic = await CreateConversationAsync(userId, DateTimeOffset.UtcNow.AddMinutes(-5));
        var turnedOnAt = DateTimeOffset.UtcNow;

        // Act
        await SetMemoryAsync(userId, true);

        // Assert
        var stored = await StoredConversationAsync(openTopic);
        stored.MemoryProcessedAt.Should().BeOnOrAfter(turnedOnAt,
            because: "messages sent while memory was off must never be read for memories after it is turned back on");
        stored.ClosingSummary.Should().Be("",
            because: "an open topic's summary would cover what was said while memory was off and reach the next topic");
    }

    [Fact]
    public async Task Handle_MemoryTurnedBackOn_KeepsEndedTopicSummary()
    {
        // Arrange
        var userId = await CreateUserWithMemoryAsync(enabled: false);
        var past = DateTimeOffset.UtcNow.AddDays(-1);
        var endedTopic = await CreateConversationAsync(userId, past, endedAt: past, closingSummary: "Planned the week.");

        // Act
        await SetMemoryAsync(userId, true);

        // Assert
        (await StoredConversationAsync(endedTopic)).ClosingSummary.Should().Be("Planned the week.",
            because: "a summary already written is not replaced when memory comes back on");
    }

    [Fact]
    public async Task Handle_MemoryAlreadyOn_LeavesConversationsAlone()
    {
        // Arrange
        var userId = await CreateUserWithMemoryAsync(enabled: true);
        var processedAt = DateTimeOffset.UtcNow.AddMinutes(-5);
        var openTopic = await CreateConversationAsync(userId, processedAt);

        // Act
        await SetMemoryAsync(userId, true);

        // Assert
        var stored = await StoredConversationAsync(openTopic);
        stored.MemoryProcessedAt.Should().Be(processedAt,
            because: "saving settings with memory still on must not skip messages waiting to be learned");
        stored.ClosingSummary.Should().BeNull(
            because: "only turning memory back on closes open topics without a summary");
    }
}
