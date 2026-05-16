using Serilog;
using Serilog.Events;

namespace BlotzTask.Extension;

public static class LoggingExtensions
{
    public static WebApplicationBuilder AddSerilogLogging(this WebApplicationBuilder builder)
    {
        var loggerConfiguration = new LoggerConfiguration()
            .ReadFrom.Configuration(builder.Configuration);

        var connectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
        if (!string.IsNullOrEmpty(connectionString))
        {
            loggerConfiguration.WriteTo.ApplicationInsights(
                connectionString,
                TelemetryConverter.Traces,
                LogEventLevel.Warning);
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
