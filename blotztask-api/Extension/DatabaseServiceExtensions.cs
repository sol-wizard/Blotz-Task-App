using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using BlotzTask.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BlotzTask.Extension;

public static class DatabaseServiceExtensions
{
    public static IServiceCollection AddDatabaseContext(this IServiceCollection services, IConfiguration configuration, IWebHostEnvironment environment)
    {
        if (environment.IsDevelopment())
        {
            var databaseConnectionString = configuration.GetConnectionString("DefaultConnection");
            services.AddDbContext<BlotzTaskDbContext>(options => options.UseSqlServer(databaseConnectionString));
        }

        if (environment.IsProduction())
        {
            var databaseConnectionString = configuration.GetConnectionString("DefaultConnection");
            if (!string.IsNullOrWhiteSpace(databaseConnectionString))
            {
                services.AddDbContext<BlotzTaskDbContext>(options => options.UseSqlServer(databaseConnectionString));
                return services;
            }

            var keyVaultEndpoint = configuration["KeyVault:VaultURI"];
            if (string.IsNullOrWhiteSpace(keyVaultEndpoint))
            {
                throw new InvalidOperationException(
                    "Missing database connection string. Set ConnectionStrings:DefaultConnection (recommended via Key Vault reference) or KeyVault:VaultURI.");
            }

            var secretClient = new SecretClient(new Uri(keyVaultEndpoint), new DefaultAzureCredential());
            services.AddSingleton(secretClient);

            var sqlConnectionSecret = secretClient.GetSecret("sql-connection-string").Value.Value;
            services.AddDbContext<BlotzTaskDbContext>(options => options.UseSqlServer(sqlConnectionSecret));
        }

        return services;
    }
}

