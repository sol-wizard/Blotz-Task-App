using System.Security.Claims;
using BlotzTask.Application.Common.Interfaces;
using BlotzTask.Domain.Entities;
using BlotzTask.Domain.Enums;
using BlotzTask.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BlotzTask.Infrastructure.Data;

public static class ApplicationDbContextSeed
{
    public static async Task SeedRolesAndAdminUserAsync(UserManager<ApplicationUser> userManager, RoleManager<IdentityRole> roleManager, ILogger logger)
    {
        // Seed Roles
        if (!await roleManager.RoleExistsAsync("Admin"))
        {
            await roleManager.CreateAsync(new IdentityRole("Admin"));
            logger.LogInformation("Admin role created.");
        }
        else
        {
            logger.LogInformation("Admin role already exists.");
        }

        // Seed Admin User
        var adminEmail = "blotztest1@gmail.com";
        var adminUser = await userManager.FindByEmailAsync(adminEmail);

        if (adminUser == null)
        {
            adminUser = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                EmailConfirmed = true,
                FirstName = "Blotz",
                LastName = "Test"
            };

            var result = await userManager.CreateAsync(adminUser, "@Blotztest1");
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
                await userManager.AddClaimsAsync(adminUser, new List<Claim>
                {
                    new Claim("CanEdit", "true"),
                    new Claim("CanPost", "true"),
                    new Claim("CanDelete", "true")
                });

                logger.LogInformation("Admin user created successfully.");
            }
            else
            {
                logger.LogWarning("Failed to create Admin user.");
            }
        }
        else
        {
            logger.LogInformation("Admin user already exists.");
        }
    }
}