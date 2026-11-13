using BlotzTask.Modules.BreakDown.Commands;

namespace BlotzTask.Modules.BreakDown.Services;

public class BreakdownJobRunner(
    BreakdownJobQueue queue,
    IServiceScopeFactory scopeFactory,
    ILogger<BreakdownJobRunner> logger) : BackgroundService
{
    // How many breakdowns run at once. The AI call is mostly waiting, so a few workers cost little;
    // the cap stops a slow AI period from piling up unlimited calls.
    private const int WorkerCount = 4;

    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var workers = Enumerable.Range(0, WorkerCount).Select(_ => RunWorkerAsync(stoppingToken));
        return Task.WhenAll(workers);
    }

    private async Task RunWorkerAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var request in queue.ReadAllAsync(stoppingToken))
            {
                try
                {
                    using var scope = scopeFactory.CreateScope();
                    var handler = scope.ServiceProvider.GetRequiredService<RunTaskBreakdownJobCommandHandler>();
                    await handler.Handle(request, stoppingToken);
                }
                catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
                {
                    logger.LogError(ex, "Breakdown job for task {TaskId} crashed", request.TaskItemId);
                }
            }
        }
        catch (Exception) when (stoppingToken.IsCancellationRequested)
        {
            // The API is shutting down. Jobs still "Running" report failed after the maximum run time.
        }
    }
}
