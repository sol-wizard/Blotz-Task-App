using System.Text;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Reviews.Enums;
using BlotzTask.Modules.Users.Domain;
using BlotzTask.Modules.Users.Enums;
using BlotzTask.Modules.UserUnderstanding.Queries;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetUserContextQueryHandlerTests : IClassFixture<DatabaseFixture>
{
    // The 28-day statistics window is [2026-09-22 00:00 UTC, 2026-10-20 00:00 UTC).
    private static readonly DateTimeOffset Now = new(2026, 10, 20, 0, 0, 0, TimeSpan.Zero);

    private readonly BlotzTaskDbContext _context;
    private readonly GetUserContextQueryHandler _handler;
    private readonly DataSeeder _seeder;

    public GetUserContextQueryHandlerTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        _handler = new GetUserContextQueryHandler(_context, new FixedClock());
    }

    private Task<string?> HandleAsync(Guid userId) => _handler.Handle(new GetUserContextQuery { UserId = userId });

    private async Task SeedTasksAsync(Guid userId, int planned, int done)
    {
        var end = Now.AddDays(-3);
        for (var i = 0; i < planned; i++)
            await _seeder.CreateTaskAsync(userId, $"Task {i}", end.AddHours(-1), end,
                completedAt: i < done ? end : null);
    }

    private async Task SetDisplayNameAsync(Guid userId, string? displayName)
    {
        var user = await _context.AppUsers.FindAsync(userId);
        user!.DisplayName = displayName;
        await _context.SaveChangesAsync();
    }

    [Fact]
    public async Task Handle_UserWithAllFacts_StatesNameLanguageStatisticsAndReview()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var otherUserId = await _seeder.CreateUserAsync();
        _context.UserPreferences.Add(new UserPreference { UserId = userId, PreferredLanguage = Language.Zh });
        await _context.SaveChangesAsync();
        await SeedTasksAsync(userId, planned: 6, done: 3);
        await _seeder.CreateTaskAsync(userId, "Before the window", Now.AddDays(-40), Now.AddDays(-40));
        await _seeder.CreateTaskAsync(userId, "Not yet due", Now.AddDays(1), Now.AddDays(1));
        await SeedTasksAsync(otherUserId, planned: 10, done: 10);
        await _seeder.CreateReviewReportAsync(userId, ReviewPeriodType.Monthly,
            new DateTimeOffset(2026, 9, 1, 0, 0, 0, TimeSpan.Zero), new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.Zero),
            "letter", theme: "Steady mornings", oneThingToTryNext: "Plan the evening before");

        // Act
        var result = await HandleAsync(userId);

        // Assert
        result.Should().Contain("- Name: Test User", because: "a real display name is how the coach addresses the user");
        result.Should().Contain("- App language setting: Chinese (Simplified)", because: "the stored language preference is a reliable fact");
        result.Should().Contain("6 tasks were scheduled to end, 3 completed (50%)",
            because: "only this user's tasks ending inside the past 28 days are counted");
        result.Should().Contain("Latest monthly review (period ended 2026-10-01)", because: "a review from the last 45 days is still current");
        result.Should().Contain("theme \"Steady mornings\"", because: "the review theme is passed through as written");
        result.Should().Contain("one thing to try next \"Plan the evening before\"", because: "the review suggestion is passed through as written");
    }

    [Fact]
    public async Task Handle_DisplayNameIsAnEmail_OmitsName()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        await SetDisplayNameAsync(userId, "someone@example.com");
        await SeedTasksAsync(userId, planned: 5, done: 5);

        // Act
        var result = await HandleAsync(userId);

        // Assert
        result.Should().NotContain("Name:", because: "Auth0 falls back to the email address, which is not a name to call someone");
        result.Should().NotContain("someone@example.com", because: "the email address must not reach the model as a name");
    }

    [Fact]
    public async Task Handle_FewerThanFiveTasksInWindow_OmitsStatistics()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        await SeedTasksAsync(userId, planned: 4, done: 1);

        // Act
        var result = await HandleAsync(userId);

        // Assert
        result.Should().NotContain("Last 28 days", because: "a completion rate from fewer than five tasks is too noisy to state");
    }

    [Fact]
    public async Task Handle_ReviewOlderThan45Days_OmitsReview()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        await _seeder.CreateReviewReportAsync(userId, ReviewPeriodType.Monthly,
            new DateTimeOffset(2026, 8, 1, 0, 0, 0, TimeSpan.Zero), new DateTimeOffset(2026, 9, 1, 0, 0, 0, TimeSpan.Zero),
            "letter", theme: "Old theme");

        // Act
        var result = await HandleAsync(userId);

        // Assert
        result.Should().NotContain("Old theme", because: "a review that ended more than 45 days ago no longer describes the user");
    }

    [Fact]
    public async Task Handle_LongReviewFields_TruncatesAndStaysWithinByteLimit()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        _context.UserPreferences.Add(new UserPreference { UserId = userId, PreferredLanguage = Language.Zh });
        await _context.SaveChangesAsync();
        await SeedTasksAsync(userId, planned: 5, done: 2);
        await _seeder.CreateReviewReportAsync(userId, ReviewPeriodType.Weekly,
            new DateTimeOffset(2026, 10, 12, 0, 0, 0, TimeSpan.Zero), new DateTimeOffset(2026, 10, 19, 0, 0, 0, TimeSpan.Zero),
            "letter", theme: new string('稳', 300), oneThingToTryNext: new string('试', 300));

        // Act
        var result = await HandleAsync(userId);

        // Assert
        result.Should().Contain(new string('稳', 200) + "…", because: "each review field is cut to 200 characters");
        result.Should().NotContain(new string('稳', 201), because: "nothing past the 200-character cut reaches the model");
        Encoding.UTF8.GetByteCount(result!).Should().BeLessThanOrEqualTo(GetUserContextQueryHandler.MaxBytes,
            because: "the block lives in every model call and must fit its budget");
    }

    [Fact]
    public async Task Handle_NoReliableFacts_ReturnsNull()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        await SetDisplayNameAsync(userId, null);

        // Act
        var result = await HandleAsync(userId);

        // Assert
        result.Should().BeNull(because: "with nothing to state, no context message is added to the prompt");
    }

    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }
}
