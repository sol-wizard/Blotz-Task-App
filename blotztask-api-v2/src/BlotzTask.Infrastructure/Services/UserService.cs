using BlotzTask.Application.Common.Interfaces;
using BlotzTask.Domain.Entities;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BlotzTask.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ApplicationDbContext _dbContext;
    private readonly ILogger<UserService> _logger;

    public UserService(UserManager<ApplicationUser> userManager, ApplicationDbContext dbContext, ILogger<UserService> logger)
    {
        _userManager = userManager;
        _dbContext = dbContext;
        _logger = logger;
    }
    
    public async Task<string?> FindIdentityUserIdByEmailAsync(string email, CancellationToken cancellationToken)
    {
        var user = await _userManager.FindByEmailAsync(email);
        return user?.Id;
    }

    public async Task<bool> DomainUserExistsAsync(string identityUserId, CancellationToken cancellationToken)
    {
        return await _dbContext.Users
            .AnyAsync(u => u.IdentityUserId == identityUserId, cancellationToken);
    }

    public async Task<string> CreateIdentityUserAsync(string email, string password, string firstName, string lastName, CancellationToken cancellationToken)
    {
        var appUser = new ApplicationUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            FirstName = firstName,
            LastName = lastName,
        };

        var result = await _userManager.CreateAsync(appUser, password);

        if (!result.Succeeded)
        {
            throw new Exception($"Failed to create Identity user: {string.Join(", ", result.Errors.Select(e => e.Description))}");
        }
    
        return appUser.Id;
    }

    public async Task<User> CreateDomainUserAsync(string identityUserId, string firstName, string lastName, CancellationToken cancellationToken)
    {
        var domainUser = new User
        {
            IdentityUserId = identityUserId,
            FirstName = firstName,
            LastName = lastName
        };

        _dbContext.Users.Add(domainUser);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return domainUser;
    }
}