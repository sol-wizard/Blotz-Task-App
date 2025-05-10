using BlotzTask.Application.Common.Interfaces;
using BlotzTask.Application.Labels.Models;
using BlotzTask.Application.TaskItems.Models;

namespace BlotzTask.Application.TaskItems.Queries.GetTaskItems;

public record GetTaskItemsQuery: IRequest<List<TaskItemDto>>;

public class GetTaskItemsQueryHandler : IRequestHandler<GetTaskItemsQuery, List<TaskItemDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IDomainUserResolver _domainUserResolver;

    public GetTaskItemsQueryHandler(IApplicationDbContext context, IDomainUserResolver domainUserResolver)
    {
        _context = context;
        _domainUserResolver = domainUserResolver;
    }

    public async Task<List<TaskItemDto>> Handle(GetTaskItemsQuery request, CancellationToken cancellationToken)
    {
        var user = await _domainUserResolver.GetCurrentDomainUserAsync(cancellationToken);

        return await _context.TaskItems
            .Where(x => x.UserId == user.Id)
            .Include(x => x.Label)
            .OrderBy(x => x.DueDate)
            .Select(x => new TaskItemDto
            {
                Title = x.Title,
                Description = x.Description,
                DueDate = x.DueDate,
                IsDone = x.IsDone,
                Label = new LabelDto
                { 
                    Id = x.Label.LabelId, 
                    Name = x.Label.Name, 
                    Color = x.Label.Color,
                    Description = x.Label.Description,
                },
                HasTime = x.HasTime
            })
            .ToListAsync(cancellationToken);
    }
}