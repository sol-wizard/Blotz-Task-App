using BlotzTask.Domain.Entities;

namespace BlotzTask.Application.Common.Interfaces;

public interface IDomainUserResolver
{
    Task<User> GetCurrentDomainUserAsync(CancellationToken cancellationToken);
}