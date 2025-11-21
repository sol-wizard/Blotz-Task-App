using BlotzTask.Infrastructure.Data;
using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Configurations;
using Microsoft.EntityFrameworkCore;
using Testcontainers.MsSql;

namespace BlotzTask.Tests.Fixtures;

public class DatabaseFixture : IAsyncLifetime
{
    private readonly MsSqlContainer _container;

    public BlotzTaskDbContext Context { get; private set; } = null!;
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

        var options = new DbContextOptionsBuilder<BlotzTaskDbContext>()
            .UseSqlServer(_container.GetConnectionString())
            .Options;

        Context = new BlotzTaskDbContext(options);
        await Context.Database.EnsureCreatedAsync();

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

        Context.AppUsers.Add(testUser);
        await Context.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        if (Context != null)
        {
            await Context.DisposeAsync();
        }
        await _container.DisposeAsync();
    }
}

