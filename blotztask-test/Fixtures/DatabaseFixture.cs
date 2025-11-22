using BlotzTask.Infrastructure.Data;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Configurations;
using Microsoft.EntityFrameworkCore;
using Testcontainers.MsSql;

namespace BlotzTask.Tests.Fixtures;

public class DatabaseFixture : IAsyncLifetime
{
    private readonly MsSqlContainer _container;

    public DbContextOptions<BlotzTaskDbContext> Options { get; private set; } = null!;
    public Guid TestUserId { get; } = Guid.NewGuid();

    public DatabaseFixture()
    {
        _container = new MsSqlBuilder()
            .WithImage("mcr.microsoft.com/mssql/server:2022-latest")
            .WithPassword("yourStrong(!)Password")
            .WithEnvironment("ACCEPT_EULA", "Y")
            .WithCreateParameterModifier(parameters =>
            {
                parameters.Platform = "linux/amd64"; // Force x86_64 emulation on ARM
            })
            .Build();
    }

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        Options = new DbContextOptionsBuilder<BlotzTaskDbContext>()
            .UseSqlServer(_container.GetConnectionString())
            .Options;

        using var context = new BlotzTaskDbContext(Options);
        await context.Database.EnsureCreatedAsync();

        // Create a test user
        var testUser = new BlotzTask.Modules.Users.Domain.AppUser
        {
            Id = TestUserId,
            Auth0UserId = "test|123456",
            Email = "test@example.com",
            DisplayName = "Test User",
            PictureUrl = "https://example.com/picture.png",
            CreationAt = DateTime.UtcNow,
            SignUpAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.AppUsers.Add(testUser);
        await context.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        await _container.DisposeAsync();
    }
}

