using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetStarSparkFloatingTasksTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly GetStarSparkFloatingTasksQueryHandler _handler;

    public GetStarSparkFloatingTasksTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);

        var logger = TestDbContextFactory.CreateLogger<GetStarSparkFloatingTasksQueryHandler>();
        _handler = new GetStarSparkFloatingTasksQueryHandler(_context, logger);
    }
    
    [Fact]
    public async Task Handle_ShouldReturnAllFloatingTasks_WhenQueryIsEmpty()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var yesterday = DateTime.UtcNow.Date.AddDays(-1);

        await _seeder.CreateTaskAsync(
            userId,
            title: "Floating task 1",
            start: null,
            end: null,
            createdAt: yesterday
        );

        await _seeder.CreateTaskAsync(
            userId,
            title: "Floating task 2",
            start: null,
            end: null,
            createdAt: yesterday
        );

        var query = new GetStarSparkFloatingTasksQuery
        {
            UserId = userId,
            QueryString = "   " 
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().HaveCount(2,
            because: "Empty or whitespace query should return all floating tasks");
    }
    
    [Fact]
    public async Task Handle_ShouldReturnOnlyMatchingFloatingTasks()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var yesterday = DateTime.UtcNow.Date.AddDays(-1);

        // ✅ Matches: floating + keyword in title
        await _seeder.CreateTaskAsync(
            userId,
            title: "Buy milk",
            start: null,
            end: null,
            createdAt: yesterday
        );

        // ✅ Matches: floating + keyword in description
        var taskWithDescription = await _seeder.CreateTaskAsync(
            userId,
            title: "Shopping",
            start: null,
            end: null,
            createdAt: yesterday
        );
        taskWithDescription.Description = "Need to buy bread and milk";
        await _context.SaveChangesAsync();

        // ❌ Does not match keyword
        await _seeder.CreateTaskAsync(
            userId,
            title: "Read book",
            start: null,
            end: null,
            createdAt: yesterday
        );

        // ❌ Not floating (has time)
        await _seeder.CreateTaskAsync(
            userId,
            title: "Buy milk at 9am",
            start: DateTimeOffset.UtcNow,
            end: DateTimeOffset.UtcNow.AddHours(1),
            createdAt: yesterday
        );

        // ❌ Completed
        var doneTask = await _seeder.CreateTaskAsync(
            userId,
            title: "Buy milk done",
            start: null,
            end: null,
            createdAt: yesterday
        );
        doneTask.IsDone = true;
        await _context.SaveChangesAsync();

        // ❌ Floating task created today
        await _seeder.CreateTaskAsync(
            userId,
            title: "Buy milk today",
            start: null,
            end: null,
            createdAt: DateTime.UtcNow
        );

        var query = new GetStarSparkFloatingTasksQuery
        {
            UserId = userId,
            QueryString = "milk"
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().HaveCount(2,
            because: "Only two floating tasks match the query and filters");

        result.Should().Contain(t => t.Title == "Buy milk",
            because: "Floating tasks with matching titles should be included");
        result.Should().Contain(t => t.Title == "Shopping",
            because: "Floating tasks with matching descriptions should be included");

        result.Should().NotContain(t => t.Title == "Read book",
            because: "Tasks without the keyword should be excluded");
        result.Should().NotContain(t => t.Title == "Buy milk at 9am",
            because: "Non-floating tasks should be excluded");
        result.Should().NotContain(t => t.Title == "Buy milk done",
            because: "Completed tasks should be excluded");
        result.Should().NotContain(t => t.Title == "Buy milk today",
            because: "Tasks created today should be excluded");
    }


}
