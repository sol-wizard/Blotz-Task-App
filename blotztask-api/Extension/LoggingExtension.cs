using Serilog;
using Serilog.Events;
using Serilog.Formatting.Compact;

namespace BlotzTask.Extension;

public static class LoggingExtensions
{
    public static WebApplicationBuilder AddSerilogLogging(this WebApplicationBuilder builder)
    {
        var environment = builder.Environment;
        var configuration = builder.Configuration;
        var loggerConfiguration = new LoggerConfiguration()
            .ReadFrom.Configuration(configuration);

        // Add Application Insights if connection string is provided
        var appInsightsConnectionString = configuration["ApplicationInsights:ConnectionString"];
        if (!string.IsNullOrEmpty(appInsightsConnectionString))
        {
            loggerConfiguration.WriteTo.ApplicationInsights(
                appInsightsConnectionString,
                TelemetryConverter.Traces);
        }

        Log.Logger = loggerConfiguration.CreateLogger();
        builder.Host.UseSerilog();

        return builder;
    }

    public static WebApplicationBuilder AddApplicationInsights(this WebApplicationBuilder builder)
    {
        var connectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
        if (!string.IsNullOrEmpty(connectionString))
        {
            builder.Services.AddApplicationInsightsTelemetry(options =>
            {
                options.ConnectionString = connectionString;
                if (builder.Environment.IsDevelopment())
                {
                    options.DeveloperMode = true;
                    options.EnableDebugLogger = true;
                }
            });
        }
        return builder;
    }
}
