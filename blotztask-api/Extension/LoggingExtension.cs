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

        // Create Serilog configuration
        var loggerConfiguration = new LoggerConfiguration()
            .ReadFrom.Configuration(configuration)
            .Enrich.FromLogContext()
            .Enrich.WithProperty("Environment", environment.EnvironmentName)
            .Enrich.WithProperty("Application", builder.Environment.ApplicationName);

        // Configure different sinks based on environment
        if (environment.IsDevelopment())
        {
            // Development: Show everything including warnings in console with colors
            loggerConfiguration
                .MinimumLevel.Debug()
                .MinimumLevel.Override("Microsoft.AspNetCore", LogEventLevel.Information)
                .MinimumLevel.Override("Microsoft.EntityFrameworkCore", LogEventLevel.Information)
                .WriteTo.Console(
                    outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}: {Message:lj}{NewLine}{Exception}",
                    theme: Serilog.Sinks.SystemConsole.Themes.AnsiConsoleTheme.Code)
                .WriteTo.Debug();
        }
        else
        {
            // Production: More restrictive logging
            loggerConfiguration
                .MinimumLevel.Information()
                .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
                .MinimumLevel.Override("System", LogEventLevel.Warning)
                .WriteTo.Console(new CompactJsonFormatter());
        }

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
