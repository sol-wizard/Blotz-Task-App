using BlotzTask.Domain.Entities;

namespace BlotzTask.Application.Common.Interfaces;
public interface IUserService
{
    Task<string?> FindIdentityUserIdByEmailAsync(string email, CancellationToken cancellationToken);
    Task<bool> DomainUserExistsAsync(string identityUserId, CancellationToken cancellationToken);
    Task<string> CreateIdentityUserAsync(string email, string password, string firstName, string lastName, CancellationToken cancellationToken);
    Task<User> CreateDomainUserAsync(string identityUserId, string firstName, string lastName, CancellationToken cancellationToken);
}