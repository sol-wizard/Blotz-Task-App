using BlotzTask.Infrastructure.Data;
using Microsoft.Data.SqlClient;
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

        if (!environment.IsDevelopment())
        {
            // PBI #1676: SqlClient closes pooled connections after ~4-8 idle minutes, so the burst of
            // requests when the app opens had to open new ones (1-3 s slower). Keep a few warm.
            // A Min Pool Size set in the configured string wins, and Min may never exceed Max.
            var builder = new SqlConnectionStringBuilder(connectionString);
            if (builder.MinPoolSize == 0)
            {
                builder.MinPoolSize = Math.Min(10, builder.MaxPoolSize);
            }
            connectionString = builder.ConnectionString;
        }

        services.AddDbContext<BlotzTaskDbContext>(options => options.UseSqlServer(connectionString));
        return services;
    }
}
