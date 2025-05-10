using BlotzTask.Application.Common.Interfaces;
using BlotzTask.Application.Common.Models;
using BlotzTask.Domain.Entities;

namespace BlotzTask.Application.TaskItems.Commands.CreateTaskItem;

public record CreateTaskItemCommand : IRequest<ResponseWrapper<string>>
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateTimeOffset DueDate { get; init; }
    public int LabelId { get; init; }
    public bool HasTime { get; init; }
}

public class CreateTaskItemCommandHandler : IRequestHandler<CreateTaskItemCommand, ResponseWrapper<string>>
{
    private readonly IApplicationDbContext _context;
    private readonly IDomainUserResolver _domainUserResolver;

    public CreateTaskItemCommandHandler(IApplicationDbContext context, IDomainUserResolver domainUserResolver)
    {
        _context = context;
        _domainUserResolver = domainUserResolver;
    }

    public async Task<ResponseWrapper<string>> Handle(CreateTaskItemCommand request, CancellationToken cancellationToken)
    {
        var user = await _domainUserResolver.GetCurrentDomainUserAsync(cancellationToken);

        var newTask = new TaskItem
        {
            Title = request.Title,
            Description = request.Description,
            DueDate = request.DueDate,
            LabelId = request.LabelId,
            UserId = user.Id,
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