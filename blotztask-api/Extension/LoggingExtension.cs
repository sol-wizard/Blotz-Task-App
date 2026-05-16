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

    
}
