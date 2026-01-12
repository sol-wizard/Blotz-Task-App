using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetFloatingTasksByQueryTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly DataSeeder _seeder;
    private readonly GetFloatingTasksByQueryHandler _handler;

    public GetFloatingTasksByQueryTests(DatabaseFixture fixture)
    {
        _context = new BlotzTaskDbContext(fixture.Options);
        _seeder = new DataSeeder(_context);

        var logger = TestDbContextFactory.CreateLogger<GetFloatingTasksByQueryHandler>();
        _handler = new GetFloatingTasksByQueryHandler(_context, logger);
    }
    
    [Fact]
    public async Task Handle_ShouldReturnEmptyList_WhenQueryIsEmpty()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();

        var query = new GetFloatingTasksByQuery
        {
            UserId = userId,
            Query = "   " 
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().BeEmpty(
            because: "Empty or whitespace query should return no floating tasks");
    }
    
    [Fact]
    public async Task Handle_ShouldReturnOnlyMatchingFloatingTasks()
    {
        // Arrange
        var userId = await _seeder.CreateUserAsync();
        var yesterday = DateTime.UtcNow.Date.AddDays(-1);

        // ✅ 符合条件：floating + keyword in title
        await _seeder.CreateTaskAsync(
            userId,
            title: "Buy milk",
            start: null,
            end: null,
            createdAt: yesterday
        );

        // ✅ 符合条件：floating + keyword in description
        var taskWithDescription = await _seeder.CreateTaskAsync(
            userId,
            title: "Shopping",
            start: null,
            end: null,
            createdAt: yesterday
        );
        taskWithDescription.Description = "Need to buy bread and milk";
        await _context.SaveChangesAsync();

        // ❌ 不匹配 keyword
        await _seeder.CreateTaskAsync(
            userId,
            title: "Read book",
            start: null,
            end: null,
            createdAt: yesterday
        );

        // ❌ 非 floating（有时间）
        await _seeder.CreateTaskAsync(
            userId,
            title: "Buy milk at 9am",
            start: DateTimeOffset.UtcNow,
            end: DateTimeOffset.UtcNow.AddHours(1),
            createdAt: yesterday
        );

        // ❌ 已完成
        var doneTask = await _seeder.CreateTaskAsync(
            userId,
            title: "Buy milk done",
            start: null,
            end: null,
            createdAt: yesterday
        );
        doneTask.IsDone = true;
        await _context.SaveChangesAsync();

        // ❌ 今天创建的 floating task
        await _seeder.CreateTaskAsync(
            userId,
            title: "Buy milk today",
            start: null,
            end: null,
            createdAt: DateTime.UtcNow
        );

        var query = new GetFloatingTasksByQuery
        {
            UserId = userId,
            Query = "milk"
        };

        // Act
        var result = await _handler.Handle(query);

        // Assert
        result.Should().HaveCount(2);

        result.Should().Contain(t => t.Title == "Buy milk");
        result.Should().Contain(t => t.Title == "Shopping");

        result.Should().NotContain(t => t.Title == "Read book");
        result.Should().NotContain(t => t.Title == "Buy milk at 9am");
        result.Should().NotContain(t => t.Title == "Buy milk done");
        result.Should().NotContain(t => t.Title == "Buy milk today");
    }


}
