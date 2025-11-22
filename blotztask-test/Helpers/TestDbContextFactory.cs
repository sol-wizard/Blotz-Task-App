using Microsoft.Extensions.Logging;

namespace BlotzTask.Tests.Helpers;

public static class TestDbContextFactory
{
    public static ILogger<T> CreateLogger<T>()
    {
        return LoggerFactory.Create(builder => builder.AddConsole()).CreateLogger<T>();
    }
}

