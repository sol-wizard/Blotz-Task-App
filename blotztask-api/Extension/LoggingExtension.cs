using Azure.Monitor.OpenTelemetry.AspNetCore;
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
        if (!string.IsNullOrEmpty(connectionString) && !builder.Environment.IsDevelopment())
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

    public static WebApplicationBuilder AddAzureMonitorTelemetry(this WebApplicationBuilder builder)
    {
        var connectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
        var telemetryEnabled = builder.Configuration.GetValue<bool>("AzureMonitor:OpenTelemetryEnabled");

        // When disabled, skip automatic App Insights requests, dependencies, metrics, and performance counters; warning/error logs still use Serilog.
        if (!telemetryEnabled || string.IsNullOrWhiteSpace(connectionString) || builder.Environment.IsDevelopment())
        {
            return builder;
        }

        builder.Services.AddOpenTelemetry().UseAzureMonitor(options =>
        {
            options.ConnectionString = connectionString;
            options.SamplingRatio = 0.05F;
        });

        return builder;
    }
}
