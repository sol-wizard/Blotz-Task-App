using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.Tasks.Domain.Entities;
using BlotzTask.Modules.Tasks.Enums;
using BlotzTask.Modules.Tasks.Queries.Tasks;
using BlotzTask.Tests.Fixtures;
using BlotzTask.Tests.Helpers;
using FluentAssertions;

namespace BlotzTask.Tests.Queries;

public class GetTaskByIdTests : IClassFixture<DatabaseFixture>
{
    private readonly BlotzTaskDbContext _context;
    private readonly GetTaskByIdQueryHandler _handler;
    private readonly Guid _testUserId;

    public GetTaskByIdTests(DatabaseFixture fixture)
    {
        _context = fixture.Context;
        _testUserId = fixture.TestUserId;
        var logger = TestDbContextFactory.CreateLogger<GetTaskByIdQueryHandler>();
        _handler = new GetTaskByIdQueryHandler(_context, logger);
    }

    [Fact]
    public async Task GetTaskById_ShouldReturn_TaskWithCorrectId()
    {
        var task = new TaskItem
        {
            Title = "Test Task",
            Description = "Test Description",
            UserId = _testUserId,
            StartTime = new DateTimeOffset(2024, 11, 20, 9, 0, 0, TimeSpan.Zero),
            EndTime = new DateTimeOffset(2024, 11, 20, 17, 0, 0, TimeSpan.Zero),
            TimeType = TaskTimeType.RangeTime,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.TaskItems.AddAsync(task);
        await _context.SaveChangesAsync();

        var query = new GetTasksByIdQuery { TaskId = task.Id };

        var result = await _handler.Handle(query);

        result.Should().NotBeNull();
        result.Id.Should().Be(task.Id);
        result.Title.Should().Be("Test Task");
        result.Description.Should().Be("Test Description");
    }
}

