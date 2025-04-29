using BlotzTask.Application.Common.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace BlotzTask.Infrastructure.Data.Seeding;

public static class SeedingManager
{
    public static async Task SeedDevelopmentDatabaseAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        //TODO: Check how to write this ilogger here with the right class type
        var logger = services.GetRequiredService<ILogger<ApplicationDbContext>>();
        
        try
        {
            var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
            var userService = services.GetRequiredService<IUserService>();

            await ApplicationDbContextSeed.SeedRolesAndAdminUserAsync(
                roleManager, 
                userService, 
                logger, 
                cancellationToken
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }
}