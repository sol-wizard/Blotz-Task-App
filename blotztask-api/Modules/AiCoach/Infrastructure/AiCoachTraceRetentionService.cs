using BlotzTask.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

public sealed class AiCoachTraceRetentionService(
    IServiceScopeFactory scopes, TimeProvider clock,
    IOptions<AiCoachModuleOptions> options, ILogger<AiCoachTraceRetentionService> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(24));
        do
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
                var cutoff = clock.GetUtcNow().AddDays(-options.Value.TraceRetentionDays);
                var removed = await db.AiCoachTraceEvents
                    .Where(x => x.CreatedAt < cutoff)
                    .ExecuteDeleteAsync(stoppingToken);
                if (removed > 0)
                    logger.LogInformation("Removed {Count} expired AiCoach diagnostic events", removed);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "AiCoach diagnostic retention cleanup failed");
            }
            try
            {
                if (!await timer.WaitForNextTickAsync(stoppingToken)) return;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
        } while (!stoppingToken.IsCancellationRequested);
    }
}
