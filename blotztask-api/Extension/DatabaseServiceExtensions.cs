using BlotzTask.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Extension;

public static class DatabaseServiceExtensions
{
    public static IServiceCollection AddDatabaseContext(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment environment)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Missing database connection string. Set ConnectionStrings:DefaultConnection in configuration or via Key Vault reference.");
        }

        services.AddDbContext<BlotzTaskDbContext>(options => options.UseSqlServer(connectionString));
        return services;
    }
}
