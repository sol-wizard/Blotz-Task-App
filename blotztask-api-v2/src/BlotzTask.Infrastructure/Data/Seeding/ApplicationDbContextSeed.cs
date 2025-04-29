using BlotzTask.Application.Common.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace BlotzTask.Infrastructure.Data.Seeding;

public static class ApplicationDbContextSeed
{
    public static async Task SeedRolesAndAdminUserAsync(
        RoleManager<IdentityRole> roleManager,
        IUserService userService,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        const string AdminRoleName = "Admin";
        const string AdminEmail = "blotztest1@gmail.com";
        const string AdminPassword = "@Blotztest1";
        const string AdminFirstName = "Blotz";
        const string AdminLastName = "Admin";

        await EnsureRoleExistsAsync(roleManager, AdminRoleName, logger, cancellationToken);

        var identityUserId = await EnsureIdentityUserExistsAsync(
            userService, 
            AdminEmail, 
            AdminPassword, 
            AdminFirstName, 
            AdminLastName, 
            logger, 
            cancellationToken);

        await EnsureDomainUserExistsAsync(
            userService, 
            identityUserId, 
            AdminFirstName, 
            AdminLastName, 
            logger, 
            cancellationToken);
    }

    private static async Task EnsureRoleExistsAsync(
        RoleManager<IdentityRole> roleManager,
        string roleName,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (await roleManager.RoleExistsAsync(roleName))
        {
            logger.LogInformation("✅ Role '{RoleName}' already exists.", roleName);
            return;
        }

        var result = await roleManager.CreateAsync(new IdentityRole(roleName));
        if (result.Succeeded)
        {
            logger.LogInformation("✅ Role '{RoleName}' created successfully.", roleName);
        }
        else
        {
            logger.LogError("❌ Failed to create role '{RoleName}': {Errors}", roleName, string.Join(", ", result.Errors.Select(e => e.Description)));
            throw new Exception($"Failed to create role '{roleName}'.");
        }
    }

    private static async Task<string> EnsureIdentityUserExistsAsync(
        IUserService userService,
        string email,
        string password,
        string firstName,
        string lastName,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var identityUserId = await userService.FindIdentityUserIdByEmailAsync(email, cancellationToken);

        if (identityUserId != null)
        {
            logger.LogInformation("✅ Identity user with email '{Email}' already exists.", email);
            return identityUserId;
        }

        logger.LogInformation("⚡ Creating new Identity user for email '{Email}'...", email);

        identityUserId = await userService.CreateIdentityUserAsync(email, password, firstName, lastName, cancellationToken);

        logger.LogInformation("✅ Identity user created for email '{Email}'.", email);

        return identityUserId;
    }

    private static async Task EnsureDomainUserExistsAsync(
        IUserService userService,
        string identityUserId,
        string firstName,
        string lastName,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var domainUserExists = await userService.DomainUserExistsAsync(identityUserId, cancellationToken);

        if (domainUserExists)
        {
            logger.LogInformation("✅ Domain User linked to IdentityUserId '{IdentityUserId}' already exists.", identityUserId);
            return;
        }

        logger.LogInformation("⚡ Creating Domain User linked to IdentityUserId '{IdentityUserId}'...", identityUserId);

        await userService.CreateDomainUserAsync(identityUserId, firstName, lastName, cancellationToken);

        logger.LogInformation("✅ Domain User created linked to IdentityUserId '{IdentityUserId}'.", identityUserId);
    }
}
