using BlotzTask.Application.Common.Interfaces;
using BlotzTask.Application.Labels.Models;

namespace BlotzTask.Application.Labels.Queries.GetLabels;

public record GetLabelsQuery() : IRequest<List<LabelDto>>;

public class GetLabelsQueryHandler : IRequestHandler<GetLabelsQuery, List<LabelDto>>
{
    private readonly IApplicationDbContext _context;

    public GetLabelsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<LabelDto>> Handle(GetLabelsQuery request, CancellationToken cancellationToken)
    {
        return await _context.Labels
            .Select(label => new LabelDto
            {
                Id = label.LabelId,
                Name = label.Name,
                Color = label.Color,
                Description = label.Description,
            })
            .ToListAsync(cancellationToken);
    }
}
