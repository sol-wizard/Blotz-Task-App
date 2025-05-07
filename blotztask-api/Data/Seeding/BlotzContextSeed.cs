using System.Security.Claims;
using BlotzTask.Data;
using BlotzTask.Data.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

public static class BlotzContextSeed
{
    public static async Task SeedBlotzUserAsync(UserManager<User> userManager, RoleManager<IdentityRole> roleManager)
    {
        await SeedRolesAsync(roleManager);
        var user = await SeedRegularUserAsync(userManager);
        if (user == null)
        {
            Console.WriteLine("Regular user creation failed or already exists. Exiting seeding process.");
            return;
        }
    }


    private static async Task SeedRolesAsync(RoleManager<IdentityRole> roleManager)
    {
        if (!await roleManager.RoleExistsAsync("User"))
        {
            await roleManager.CreateAsync(new IdentityRole("User"));
            Console.WriteLine("User role created successfully.");
        }
        else
        {
            Console.WriteLine("User role already exists.");
        }
    }

    private static async Task<User?> SeedRegularUserAsync(UserManager<User> userManager)
    {
        var defaultUser = new User
        {
            FirstName = "Blotz",
            LastName = "Test",
            UserName = "blotztest1@gmail.com",
            Email = "blotztest1@gmail.com",
            EmailConfirmed = true,
        };

        var user = await userManager.FindByEmailAsync(defaultUser.Email);
        if (user != null)
        {
            Console.WriteLine($"User with email {defaultUser.Email} already exists.");
            return user;
        }

        var createUserResult = await userManager.CreateAsync(defaultUser, "@Blotztest1");
        if (!createUserResult.Succeeded)
        {
            Console.WriteLine("Regular user creation failed.");
            return null;
        }

        await userManager.AddToRoleAsync(defaultUser, "User");
        user = await userManager.FindByEmailAsync(defaultUser.Email);

        if (user != null)
        {
            var claims = new List<Claim>
            {
                new Claim("CanEdit", "true"),
                new Claim("CanPost", "true"),
                new Claim("CanDelete", "true")
            };
            await userManager.AddClaimsAsync(user, claims);
            Console.WriteLine("Regular user and claims created successfully.");
        }

        return user;
    }
}