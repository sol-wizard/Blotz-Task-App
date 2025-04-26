using BlotzTask.Domain.Entities;

namespace BlotzTask.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Label> Labels { get; }
    DbSet<TaskItem> TaskItems { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}