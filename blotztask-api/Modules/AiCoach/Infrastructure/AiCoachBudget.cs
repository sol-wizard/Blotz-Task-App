using BlotzTask.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace BlotzTask.Modules.AiCoach.Infrastructure;

/// <summary>
/// Durable AI Coach spend limits, both per Perth calendar month: one cap for the whole environment
/// and a free allowance per user. Reservations survive cancellation and process restarts.
/// </summary>
public sealed class AiCoachBudget(IServiceScopeFactory scopes, TimeProvider clock,
    IHostEnvironment environment, IOptions<AiCoachModuleOptions> options,
    ILogger<AiCoachBudget> logger)
{
    private static readonly TimeZoneInfo Perth = TimeZoneInfo.FindSystemTimeZoneById("Australia/Perth");

    public bool Enabled => options.Value.MonthlyBudgetUsd.HasValue && options.Value.UserMonthlyAllowanceUsd.HasValue;

    /// <summary>First day of the current budget month and of the next one, in Perth.</summary>
    public (DateOnly Start, DateOnly NextStart) CurrentMonth()
    {
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(clock.GetUtcNow(), Perth).DateTime);
        var start = new DateOnly(today.Year, today.Month, 1);
        return (start, start.AddMonths(1));
    }

    /// <summary>This month's spend, unsettled reservations included, read without taking the budget lock.</summary>
    public async Task<AiCoachBudgetUsage> GetUsageAsync(Guid userId, CancellationToken ct)
    {
        var environmentName = environment.EnvironmentName;
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
        var (start, nextStart) = CurrentMonth();
        var month = db.AiCoachBudgetCharges.AsNoTracking()
            .Where(x => x.Environment == environmentName && x.BudgetDate >= start && x.BudgetDate < nextStart);
        var environmentUsed = await month.SumAsync(x => (decimal?)x.ChargedUsd, ct) ?? 0m;
        var userUsed = await month.Where(x => x.UserId == userId).SumAsync(x => (decimal?)x.ChargedUsd, ct) ?? 0m;
        return new(userUsed, environmentUsed, nextStart);
    }

    /// <param name="userId">Null only for tooling outside a user's conversation; it then counts
    /// towards the environment cap alone.</param>
    public async Task<Guid> ReserveAsync(Guid? userId, string model, decimal reservedUsd, CancellationToken ct)
    {
        if (reservedUsd <= 0) throw new InvalidOperationException("AI Coach budget reservations must be positive.");
        var limits = options.Value;
        var environmentName = environment.EnvironmentName;
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BlotzTaskDbContext>();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // The SQL lock serializes sum + insert across processes, including the first call of a month.
        // No database lock is held while contacting the model provider.
        var lockName = $"AiCoachBudget:{environmentName}";
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            DECLARE @result int;
            EXEC @result = sys.sp_getapplock @Resource = {lockName}, @LockMode = 'Exclusive',
                @LockOwner = 'Transaction', @LockTimeout = 10000;
            IF @result < 0 THROW 51000, 'Could not acquire AI Coach budget lock.', 1;
            """, ct);
        var (start, nextStart) = CurrentMonth();
        var month = db.AiCoachBudgetCharges
            .Where(x => x.Environment == environmentName && x.BudgetDate >= start && x.BudgetDate < nextStart);

        var environmentUsed = await month.SumAsync(x => (decimal?)x.ChargedUsd, ct) ?? 0m;
        if (environmentUsed + reservedUsd > limits.MonthlyBudgetUsd!.Value)
        {
            logger.LogWarning("AiCoach monthly budget blocked {Model} in {BudgetMonth}: {UsedUsd} charged/reserved, {RequestedUsd} requested, {LimitUsd} limit",
                model, start, environmentUsed, reservedUsd, limits.MonthlyBudgetUsd);
            throw new AiCoachBudgetExceededException(AiCoachBudgetScope.Environment, nextStart);
        }

        if (userId is { } id)
        {
            // Any remaining allowance admits the call, so the last call may overdraw by at most its own
            // cost. A strict check would strand allowance smaller than one worst-case reservation.
            var userUsed = await month.Where(x => x.UserId == id).SumAsync(x => (decimal?)x.ChargedUsd, ct) ?? 0m;
            if (userUsed >= limits.UserMonthlyAllowanceUsd!.Value)
            {
                logger.LogInformation("AiCoach user allowance exhausted for {UserId} in {BudgetMonth}: {UsedUsd} used",
                    id, start, userUsed);
                throw new AiCoachBudgetExceededException(AiCoachBudgetScope.User, nextStart);
            }
        }

        var now = clock.GetUtcNow();
        var charge = new AiCoachBudgetCharge
        {
            Id = Guid.NewGuid(), UserId = userId,
            BudgetDate = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(now, Perth).DateTime),
            Environment = environmentName, Model = model, ChargedUsd = reservedUsd, CreatedAt = now,
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

public sealed record AiCoachBudgetUsage(decimal UserUsedUsd, decimal EnvironmentUsedUsd, DateOnly ResetsOn);
