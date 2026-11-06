using BlotzTask.Infrastructure.Data;
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
        _handler = new UpdateUserPreferenceCommandHandler(_context,
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
}
