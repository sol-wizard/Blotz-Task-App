using BlotzTask.Application.Common.Interfaces;
using BlotzTask.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace BlotzTask.Infrastructure.Data;

public static class SeedingManager
{
    public static async Task SeedDevelopmentDatabaseAsync(IServiceProvider services)
    {
        var logger = services.GetRequiredService<ILogger<ApplicationDbContext>>();
        
        try
        {
            var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
            var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
            var context = services.GetRequiredService<IApplicationDbContext>();

            await ApplicationDbContextSeed.SeedRolesAndAdminUserAsync(userManager, roleManager, logger);

            var adminUser = await userManager.FindByEmailAsync("blotztest1@gmail.com");
            // if (adminUser != null)
            // {
            //     await ApplicationDbContextSeed.SeedSampleTasksAsync(context, adminUser.Id, logger);
            // }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }
}