using BlotzTask.Application.Common.Interfaces;
using BlotzTask.Infrastructure.Data;
using BlotzTask.Infrastructure.Identity;
using BlotzTask.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace BlotzTask.Infrastructure;

public static class DependencyInjection
{
    public static void AddInfrastructureServices(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;
        var configuration = builder.Configuration;
        
        // ✅ Local Development Connection
        var dbConnectionString = configuration.GetConnectionString("DefaultConnection");

        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(dbConnectionString));
        
        // ✅ Bind the IApplicationDbContext interface to the concrete ApplicationDbContext implementation
        services.AddScoped<IApplicationDbContext>(provider =>
            provider.GetRequiredService<ApplicationDbContext>());

        // ✅ ASP.NET Core Identity setup
        services.AddIdentityCore<ApplicationUser>()
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();
        
        // ✅ Service Register
        services.AddScoped<IUserService, UserService>();
        
        // ✅ Authorization
        services.AddAuthorization();
    }
}