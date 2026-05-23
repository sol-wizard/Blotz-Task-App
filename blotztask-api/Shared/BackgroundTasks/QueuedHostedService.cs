namespace BlotzTask.Shared.BackgroundTasks;

public class QueuedHostedService(
    ILogger<QueuedHostedService> logger,
    IBackgroundTaskQueue taskQueue,
    IServiceScopeFactory scopeFactory) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var work = await taskQueue.DequeueAsync(stoppingToken);
            try
            {
                logger.LogInformation("[QueuedHostedService] Dequeued task — starting background execution");
                using var scope = scopeFactory.CreateScope();
                await work(scope.ServiceProvider, stoppingToken);
                logger.LogInformation("[QueuedHostedService] Background task completed");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "[QueuedHostedService] Error executing background task");
            }
        }
    }
}
