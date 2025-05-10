using BlotzTask.Application.Common.Interfaces;
using BlotzTask.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Infrastructure.Identity;

public class DomainUserResolver : IDomainUserResolver
{
    private readonly IApplicationDbContext _context;
    private readonly IUserContext _userContext;

    public DomainUserResolver(IApplicationDbContext context, IUserContext userContext)
    {
        _context = context;
        _userContext = userContext;
    }

    public async Task<User> GetCurrentDomainUserAsync(CancellationToken cancellationToken)
    {
        var identityId = _userContext.UserId;

        var domainUser = await _context.Users
            .FirstOrDefaultAsync(u => u.IdentityUserId == identityId, cancellationToken);

        if (domainUser is null)
        {
            throw new UnauthorizedAccessException("Domain user not found for authenticated identity.");
        }

        return domainUser;
    }
}