using BlotzTask.Infrastructure.Data;
using BlotzTask.Modules.AiUsage.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

/// <summary>Shared, durable staging budget. Reservations survive cancellation and process restarts.</summary>
public sealed class AiCoachDailyBudget(IServiceScopeFactory scopes, TimeProvider clock,
    IHostEnvironment environment, IOptions<AiCoachModuleOptions> options,
    ILogger<AiCoachDailyBudget> logger)
{
    private static readonly TimeZoneInfo Perth = TimeZoneInfo.FindSystemTimeZoneById("Australia/Perth");

    public bool Enabled => environment.IsStaging() && options.Value.DailyBudgetUsd.HasValue;

    public async Task<Guid> ReserveAsync(string model, decimal reservedUsd, CancellationToken ct)
    {
        if (reservedUsd <= 0) throw new InvalidOperationException("AI Coach budget reservations must be positive.");
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // The SQL lock serializes sum + insert across processes, including the first call of a day.
        // No database lock is held while contacting the model provider.
        var lockName = $"AiCoachDailyBudget:{Environments.Staging}";
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            DECLARE @result int;
            EXEC @result = sys.sp_getapplock @Resource = {lockName}, @LockMode = 'Exclusive',
                @LockOwner = 'Transaction', @LockTimeout = 10000;
            IF @result < 0 THROW 51000, 'Could not acquire AI Coach budget lock.', 1;
            """, ct);
        var now = clock.GetUtcNow();
        var date = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(now, Perth).DateTime);
        var used = await db.AiCoachBudgetCharges
            .Where(x => x.Environment == Environments.Staging && x.BudgetDate == date)
            .SumAsync(x => (decimal?)x.ChargedUsd, ct) ?? 0m;
        if (used + reservedUsd > options.Value.DailyBudgetUsd!.Value)
        {
            logger.LogWarning("AiCoach daily budget blocked {Model} on {BudgetDate}: {UsedUsd} charged/reserved, {RequestedUsd} requested, {LimitUsd} limit",
                model, date, used, reservedUsd, options.Value.DailyBudgetUsd);
            throw new AiQuotaExceededException("AI Coach daily budget is exhausted; it resets at midnight in Perth.");
        }
        var charge = new AiCoachBudgetCharge
        {
            Id = Guid.NewGuid(), BudgetDate = date, Environment = Environments.Staging,
            Model = model, ChargedUsd = reservedUsd, CreatedAt = now,
        };
        db.AiCoachBudgetCharges.Add(charge);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return charge.Id;
    }

    public async Task SettleAsync(Guid id, decimal actualUsd)
    {
        // Accounting must finish even when the HTTP caller disconnects after a billed response.
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
        var updated = await db.AiCoachBudgetCharges.Where(x => x.Id == id && !x.Settled)
            .ExecuteUpdateAsync(setters => setters.SetProperty(x => x.ChargedUsd, actualUsd)
                .SetProperty(x => x.Settled, true), timeout.Token);
        if (updated != 1) throw new InvalidOperationException("AI Coach budget reservation was not found or already settled.");
    }
}
