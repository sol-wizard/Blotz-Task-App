using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetWeeklyTaskAvailabilityTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly GetWeeklyTaskAvailabilityQueryHandler _handler;
    private readonly DataSeeder _seeder;

    public GetWeeklyTaskAvailabilityTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);
        var logger = TestDbContextFactory.CreateLogger<GetWeeklyTaskAvailabilityQueryHandler>();
        _handler = new GetWeeklyTaskAvailabilityQueryHandler(_context, logger);
    }

    [Fact]
    public async Task Handle_ShouldReturnTrue_WhenUserHasTasksOnTheDate()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var mondayUtc = new DateTimeOffset(2024, 12, 9, 0, 0, 0, TimeSpan.Zero);

        // 1. Completed Task on Monday
        var completedTask = await _seeder.CreateTaskAsync(userId, "Completed Task", mondayUtc.AddHours(9), mondayUtc.AddHours(10));
        completedTask.IsDone = true;
        await _context.SaveChangesAsync(); // Update the IsDone status

        // 2. Incomplete Task on Tuesday
        await _seeder.CreateTaskAsync(userId, "Incomplete Task", mondayUtc.AddDays(1).AddHours(10), mondayUtc.AddDays(1).AddHours(11));

        // 3. Floating Task Created on Wednesday
        // This task has NO start/end time, but its CreatedAt matches Wednesday.
        // The green dot SHOULD appear on Wednesday because this task will appear on Wednesday's calendar page.
        await _seeder.CreateTaskAsync(userId, "Floating Task Wednesday", null, null, createdAt: mondayUtc.AddDays(2).AddHours(12));

        var query = new GetWeeklyTaskAvailabilityQuery
        {
            UserId = userId,
            MondayUtc = mondayUtc
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        // Monday (Index 0) - Has a COMPLETED task -> Should show dot (True)
        result[0].HasTask.Should().BeTrue("A completed task exists on Monday, so the green dot should appear below the date.");

        // Tuesday (Index 1) - Has an INCOMPLETE task -> Should show dot (True)
        result[1].HasTask.Should().BeTrue("An incomplete task exists on Tuesday, so the green dot should appear below the date.");
        
        // Wednesday (Index 2) - Has a FLOATING task created that day -> Should show dot (True)
        result[2].HasTask.Should().BeTrue("A floating task was created on Wednesday (visible in All section), so the green dot should appear below the date.");

        // Thursday (Index 3) - No task -> No dot (False)
        result[3].HasTask.Should().BeFalse("No tasks exist for Thursday, so no green dot should appear.");
    }
}
