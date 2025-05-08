using BlotzTask.Application.Common.Interfaces;
using BlotzTask.Application.Common.Models;
using BlotzTask.Domain.Entities;

namespace BlotzTask.Application.Tasks.Commands.CreateTaskItem;

public record CreateTaskItemCommand : IRequest<ResponseWrapper<string>>
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTimeOffset DueDate { get; init; }
    public int LabelId { get; init; }
    public int UserId { get; init; } 
    public bool HasTime { get; init; }
}

public class CreateTaskItemCommandHandler : IRequestHandler<CreateTaskItemCommand, ResponseWrapper<string>>
{
    private readonly IApplicationDbContext _context;

    public CreateTaskItemCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ResponseWrapper<string>> Handle(CreateTaskItemCommand request, CancellationToken cancellationToken)
    {
        var newTask = new TaskItem
        {
            Title = request.Title,
            Description = request.Description,
            DueDate = request.DueDate,
            LabelId = request.LabelId,
            UserId = request.UserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            HasTime = request.HasTime
        };

        _context.TaskItems.Add(newTask);
        await _context.SaveChangesAsync(cancellationToken);

        return new ResponseWrapper<string>(
            newTask.Title,
            "Task added successfully.",
            true
        );
    }
}