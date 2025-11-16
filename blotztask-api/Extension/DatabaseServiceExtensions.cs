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
            var keyVaultEndpoint = configuration["KeyVault:VaultURI"];
            var secretClient = new SecretClient(new Uri(keyVaultEndpoint), new DefaultAzureCredential());
            services.AddSingleton(secretClient);

            var sqlConnectionSecret = secretClient.GetSecret("sql-connection-string").Value.Value;
            services.AddDbContext<BlotzTaskDbContext>(options =>
                options.UseSqlServer(sqlConnectionSecret));
        }

        return services;
    }
}


